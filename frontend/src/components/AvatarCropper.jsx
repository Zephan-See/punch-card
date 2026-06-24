import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

// 把裁切后的图片转成 base64
const getCroppedImg = (imageSrc, pixelCrop) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y,
        pixelCrop.width, pixelCrop.height,
        0, 0, size, size
      );
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.src = imageSrc;
  });
};

export default function AvatarCropper({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    const base64 = await getCroppedImg(imageSrc, croppedAreaPixels);
    onConfirm(base64);
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
        <div className="bg-indigo-600 text-white p-4">
          <h3 className="font-bold text-lg">✂️ 裁切头像</h3>
          <p className="text-xs opacity-90 mt-1">拖动移动 · 滑动缩放 · 调整后确认</p>
        </div>

        {/* 裁切区域 */}
        <div className="relative w-full h-80 bg-gray-100">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* 缩放控制 */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              缩放 {zoom.toFixed(1)}x
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                −
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                +
              </button>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onCancel}
              disabled={processing}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing || !croppedAreaPixels}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {processing ? '处理中...' : '✅ 确认'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
