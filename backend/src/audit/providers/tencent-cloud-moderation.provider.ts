import { Injectable } from '@nestjs/common'
import * as tencentcloud from 'tencentcloud-sdk-nodejs'

const Tms = tencentcloud.tms.v20201229
const Ims = tencentcloud.ims.v20201229

export type ModerationResult = 'pass' | 'reject' | 'review'

export interface TextModerationResponse {
  result: ModerationResult
  suggestion: number
  label: string
  evilLabel: string
  evilType: number
  keywords: string[]
}

export interface ImageModerationResponse {
  result: ModerationResult
  suggestion: number
  label: string
  evilLabel: string
  evilType: number
  faceNames: string[]
}

@Injectable()
export class TencentCloudModerationProvider {
  private readonly secretId: string
  private readonly secretKey: string
  private readonly region: string
  private readonly textClient: any
  private readonly imageClient: any

  constructor() {
    this.secretId = process.env.TC_SECRET_ID || ''
    this.secretKey = process.env.TC_SECRET_KEY || ''
    this.region = process.env.TC_REGION || 'ap-guangzhou'

    const clientConfig = {
      credential: {
        secretId: this.secretId,
        secretKey: this.secretKey,
      },
      region: this.region,
    }

    this.textClient = new Tms.Client(clientConfig)
    this.imageClient = new Ims.Client(clientConfig)
  }

  async moderateText(text: string): Promise<TextModerationResponse> {
    if (!text || text.trim().length === 0) {
      return {
        result: 'pass',
        suggestion: 0,
        label: 'Normal',
        evilLabel: 'Normal',
        evilType: 0,
        keywords: [],
      }
    }

    try {
      const response = await this.textClient.TextModeration({
        Content: Buffer.from(text).toString('base64'),
      })

      return this.parseTextResponse(response)
    } catch (error) {
      console.error('Text moderation error:', error)
      throw error
    }
  }

  async moderateImage(imageUrl: string): Promise<ImageModerationResponse> {
    if (!imageUrl || imageUrl.trim().length === 0) {
      return {
        result: 'pass',
        suggestion: 0,
        label: 'Normal',
        evilLabel: 'Normal',
        evilType: 0,
        faceNames: [],
      }
    }

    try {
      const response = await this.imageClient.ImageModeration({
        ImageUrl: imageUrl,
      })

      return this.parseImageResponse(response)
    } catch (error) {
      console.error('Image moderation error:', error)
      throw error
    }
  }

  private parseTextResponse(response: any): TextModerationResponse {
    const evilLabels = ['Polity', 'Porn', 'Terror', 'Ad', 'Moan', 'Contraband']
    const suggestionMap: { [key: string]: number } = {
      Pass: 0,
      Review: 1,
      Block: 2,
    }

    let evilLabel = 'Normal'
    let evilType = 0

    if (response.EvilLabels && response.EvilLabels.length > 0) {
      const firstLabel = response.EvilLabels[0]
      if (firstLabel.EvilLabel && evilLabels.includes(firstLabel.EvilLabel)) {
        evilLabel = firstLabel.EvilLabel
        evilType = firstLabel.EvilType || 0
      }
    }

    const suggestion = response.Suggestion || 'Pass'
    let result: ModerationResult = 'pass'

    if (suggestion === 'Block') {
      result = 'reject'
    } else if (suggestion === 'Review') {
      result = 'review'
    }

    const keywords: string[] = []
    if (response.Keywords) {
      keywords.push(...response.Keywords)
    }

    return {
      result,
      suggestion: suggestionMap[suggestion] || 0,
      label: response.Label || 'Normal',
      evilLabel,
      evilType,
      keywords,
    }
  }

  private parseImageResponse(response: any): ImageModerationResponse {
    const evilLabels = ['Porn', 'Terror', 'Politics', 'Ads', 'Illegal']

    let evilLabel = 'Normal'
    let evilType = 0

    if (response.EvilLabels && response.EvilLabels.length > 0) {
      const firstLabel = response.EvilLabels[0]
      if (firstLabel.EvilLabel && evilLabels.includes(firstLabel.EvilLabel)) {
        evilLabel = firstLabel.EvilLabel
        evilType = firstLabel.EvilType || 0
      }
    }

    const suggestion = response.Suggestion || 'Pass'
    let result: ModerationResult = 'pass'

    if (suggestion === 'Block') {
      result = 'reject'
    } else if (suggestion === 'Review') {
      result = 'review'
    }

    const faceNames: string[] = []
    if (response.FaceNames) {
      faceNames.push(...response.FaceNames)
    }

    return {
      result,
      suggestion: suggestion === 'Pass' ? 0 : suggestion === 'Review' ? 1 : 2,
      label: response.Label || 'Normal',
      evilLabel,
      evilType,
      faceNames,
    }
  }
}
