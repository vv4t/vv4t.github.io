export class Animation {
  constructor(startFrame, frameCount, interval=1000) {
    this.startFrame = startFrame; //index of start frame
    this.frameCount = frameCount;
    this.interval = interval;
  }
}

export class AnimationEngine {
  constructor(defaultState, animationStates) {
    this.animationStates = animationStates

    this.animStartTs = Date.now()
    this.state = defaultState
  }

  play(state) { 
    /*
    changes the animStartTs so the animation plays from first frame, otherwise,
    just set the 'state' property.
    */ 
    this.animStartTs = Date.now();
    this.state = state
  }

  getCurrentFrame() {
    const delta = Date.now() - this.animStartTs;

    const a = this.animationStates[this.state]
    const frameIndex = a.startFrame + (Math.floor((delta / a.interval)) % a.frameCount);
    return frameIndex;
  }
}
