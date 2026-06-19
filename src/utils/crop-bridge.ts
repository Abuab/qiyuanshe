/** 裁剪图片桥接数据，避免跨页面 getImageInfo 失败 */
interface CropBridgeData {
  path: string
  width: number
  height: number
}

let _data: CropBridgeData | null = null

export function setCropImageData(path: string, width: number, height: number) {
  _data = { path, width, height }
}

export function getAndClearCropImageData(): CropBridgeData | null {
  const d = _data
  _data = null
  return d
}
