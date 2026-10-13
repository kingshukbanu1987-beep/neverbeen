import { InjectionToken } from '@angular/core';

/** Lazy, on-device face detection. No photo is uploaded to a third-party API. */
export const CHAT_NO_FACE_ERROR =
  'No face detected in the uploaded image, upload a new photo or take a selfie of yourself to continue.';
export const CHAT_FACE_CHECK_ERROR =
  'Your photo could not be verified. Please try again with a clear photo or take a selfie of yourself.';

let detector: Promise<typeof import('@vladmandic/face-api')> | undefined;

async function loadDetector(): Promise<typeof import('@vladmandic/face-api')> {
  if (!detector) {
    detector = (async () => {
      const api = await import('@vladmandic/face-api');
      // CPU also works on devices without WebGL; only detection is loaded, not recognition,
      // gender/age estimation or emotion classification.
      // The bundled TensorFlow runtime exports these methods, but FaceAPI's rolled-up
      // declarations omit them. Keep that compatibility cast isolated here.
      const tf = api.tf as unknown as {
        setBackend(name: string): Promise<boolean>;
        ready(): Promise<void>;
      };
      await tf.setBackend('cpu');
      await tf.ready();
      await api.nets.tinyFaceDetector.loadFromUri('/face-detection');
      return api;
    })().catch((error: unknown) => {
      detector = undefined; // A failed asset load can be retried.
      throw error;
    });
  }
  return detector;
}

/** A real face bounding box, not a skin-colour or aspect-ratio guess. Errors fail closed. */
export async function chatPhotoHasFace(dataUrl: string): Promise<boolean> {
  const api = await loadDetector();
  const image = await api.fetchImage(dataUrl);
  const faces = await api.detectAllFaces(
    image,
    new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
  );
  return faces.length > 0;
}

export const CHAT_FACE_DETECTOR = new InjectionToken<typeof chatPhotoHasFace>(
  'Chat face detector',
  {
    providedIn: 'root',
    factory: () => chatPhotoHasFace,
  },
);
