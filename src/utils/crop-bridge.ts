/** 编辑资料页 → 裁剪页 图片路径传递桥。避免 URL 编码 / storage / globalData 不可靠。 */
let _tempPath = ''

export function setCropImagePath(path: string) {
  _tempPath = path
}

export function getAndClearCropImagePath(): string {
  const p = _tempPath
  _tempPath = ''
  return p
}
