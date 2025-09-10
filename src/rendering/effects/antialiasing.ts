import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

export class FXAAPass extends ShaderPass {
  constructor() {
    super(FXAAShader);
  }
}