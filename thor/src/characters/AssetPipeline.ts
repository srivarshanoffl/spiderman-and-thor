import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterRig } from './CharacterRig';

export class AssetPipeline {
  private static loader = new GLTFLoader();

  /**
   * Attempts to load external production GLB/GLTF character models.
   * If not available or missing, gracefully allows the built-in cinematic model to drive the rig.
   */
  public static async loadCharacterModel(
    url: string,
    rig: CharacterRig
  ): Promise<THREE.Group | null> {
    try {
      const gltf = await this.loader.loadAsync(url);
      const model = gltf.scene;

      // Enable shadows and PBR properties on loaded mesh
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Attach model to rig root
      rig.root.add(model);
      return model;
    } catch {
      // Graceful fallback to procedural cinematic model
      return null;
    }
  }
}
