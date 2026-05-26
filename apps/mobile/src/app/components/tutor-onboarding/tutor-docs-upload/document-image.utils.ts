import type { Asset } from 'react-native-image-picker';
import type { PickedFile } from './document-upload.types';

export function imageAssetToPickedFile(asset: Asset): PickedFile {
  if (!asset.uri) {
    throw new Error('No photo was captured. Please try again.');
  }

  const ext =
    asset.type === 'image/png'
      ? 'png'
      : asset.fileName?.split('.').pop()?.toLowerCase() === 'png'
        ? 'png'
        : 'jpg';

  return {
    uri: asset.uri,
    name: asset.fileName ?? `document-${Date.now()}.${ext}`,
    size: asset.fileSize ?? 0,
    type: asset.type ?? (ext === 'png' ? 'image/png' : 'image/jpeg'),
  };
}
