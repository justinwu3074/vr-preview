<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { STLLoader } from "three/addons/loaders/STLLoader.js";



const container = ref<any>(null)

let scene: any
let camera: any
let renderer: any
let orb: any
let ambientLight: any;
let directionalLight: any;

onMounted(() => {
  initScene()
  initCamera()
  initRender()
  createLight()
  initModel()
  initOrb();
  animate();



})

const initScene = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color("#ECF4FE")
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // const gridHelper = new THREE.GridHelper(10000, 10000, 0x999999, 0x0999999);
  // gridHelper.position.set(0, 0.1, 0);
  // scene.add(gridHelper)


}

const initCamera = () => {
  const { clientHeight, clientWidth } = container.value
  camera = new THREE.PerspectiveCamera(50, clientWidth / clientHeight, 1, 200000)
  camera.position.set(20, 70, 50)
}

const initRender = () => {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }) //设置抗锯齿
  renderer.setClearColor(0xff0000, 0); // 第二个参数设置透明度

  //设置屏幕像素比
  renderer.setPixelRatio(window.devicePixelRatio)
  //渲染的尺寸大小
  const { clientHeight, clientWidth } = container.value
  renderer.setSize(clientWidth, clientHeight)
  //色调映射
  // renderer.toneMapping = THREE.NeutralToneMapping
  //曝光
  renderer.toneMappingExposure = 1
  // renderer.autoClear = true
  renderer.outputColorSpace = THREE.SRGBColorSpace

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.value.appendChild(renderer.domElement)
}

const initOrb = () => {
  orb = new OrbitControls(camera, renderer.domElement)

}

const createLight = () => {
  // console.log(scene)
  // 创建环境光
  ambientLight = new THREE.AmbientLight('#fff', 1)
  scene.add(ambientLight)
  // 创建平行光
  directionalLight = new THREE.DirectionalLight('#fff', 0.4)
  directionalLight.position.set(0, 100, 100)

  scene.add(directionalLight)

  // 创建平行光
  const directionalLight2 = new THREE.DirectionalLight('#fff', 0.4)
  directionalLight2.position.set(0, 50, -100)
  directionalLight2.castShadow = true

  scene.add(directionalLight2)

}

let mixer: any = null;

let model = "./model/cookie.stl";
let hdr = "./hdr/hdr-44.jpg";
const initModel = () => {

  let textureloader = new THREE.TextureLoader();
  textureloader.load(hdr, (texture: any) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    //@ts-ignore
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = texture;
  })


  // return;
  const loader = new STLLoader();
  loader.load(model, (geometry: any) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0x606060,
      metalness: 0.1,
      roughness: 0.8,
    });


    const cookie = new THREE.Mesh(geometry, material);
    // 设置初始位置在左侧
    cookie.position.set(-100, 0, 0);
    cookie.scale.set(0.04, 0.04, 0.04)
    scene.add(cookie);

    // 创建动画混合器
    mixer = new THREE.AnimationMixer(cookie);

    //总时长
    const duration = 4;
    //模型 跳跃动画
    const jumpUp = createJumpTrack(0, 20, duration)
    //模型 x轴从左到右移动的动画
    const moveRight = createMoveTrack(-100, 0, duration, 'x')
    //模型 缩放动画
    const scaleDown = createScaleTrack(0.5, 0.04, duration)


    // 创建动画剪辑
    const clip = new THREE.AnimationClip('jump', duration, [jumpUp, moveRight, scaleDown]);

    // 创建动画动作
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce); // 只播放一次
    action.clampWhenFinished = true; // 动画结束后保持最后一帧

    // 延迟 1 秒后开始动画
    setTimeout(() => {
      action.play();
    }, 1000);
  })

}
//创建跳跃动画
function createJumpTrack(minY: number, maxY: number, duration: number, interval = 0.25) {
  // 动态生成时间点和位置值
  const times = [];
  const values = [];
  let time = 0;
  let currentMaxY = maxY; // 当前最高点

  while (time <= duration) {
    // 添加上升关键帧
    times.push(time);
    values.push(minY); // 最低点
    time += interval;

    // 添加下降关键帧
    times.push(time);
    values.push(currentMaxY); // 当前最高点
    time += interval;

    // 逐渐减少最高点的高度
    currentMaxY *= 0.8; // 每次跳跃后，最高点减少 20%
  }

  // 创建 VectorKeyframeTrack
  const track = new THREE.VectorKeyframeTrack(
    '.position[y]', // 动画属性
    times, // 时间点
    values // 位置值
  );

  return track;
}
//创建物体根据坐标轴移动的动画
function createMoveTrack(startPos: number, endPos: number, duration: number, axis: string, interval: number = 0.25) {
  // 检查坐标轴是否合法
  if (axis !== 'x' && axis !== 'y' && axis !== 'z') {
    throw new Error('Invalid axis. Must be "x", "y", or "z".');
  }

  // 动态生成时间点和位置值
  const times = [];
  const values = [];
  for (let time = 0; time <= duration; time += interval) {
    times.push(time); // 时间点
    const t = time / duration; // 归一化时间（0 到 1）
    const easedT = easeInOutQuad(t); // 应用缓动函数
    const pos = startPos + (endPos - startPos) * easedT; // 缓动插值计算位置
    values.push(pos); // 位置值
  }

  // 创建 VectorKeyframeTrack
  const track = new THREE.VectorKeyframeTrack(
    `.position[${axis}]`, // 动画属性（例如 '.position[x]'）
    times, // 时间点
    values // 位置值
  );

  return track;
}

//创建缩放动画
const createScaleTrack = (startScale: number, endScale: number, duration: number, interval: number = 0.25) => {
  // 动态生成时间点和缩放值
  const times = [];
  const values = [];
  for (let time = 0; time <= duration; time += interval) {
    times.push(time); // 时间点
    const t = time / duration; // 归一化时间（0 到 1）
    const easedT = easeInOutQuad(t); // 应用缓动函数
    const scale = startScale + (endScale - startScale) * easedT; //  缓动插值计算缩放 
    // const scale = startScale + (endScale - startScale) * t; //  线性插值计算缩放
    values.push(scale, scale, scale); // X, Y, Z 缩放值
  }

  // 创建 VectorKeyframeTrack
  const track = new THREE.VectorKeyframeTrack(
    '.scale', // 动画属性
    times, // 时间点
    values // 缩放值
  );

  return track;
}

//非线性曲线
function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}


// 启动时钟
let clock = new THREE.Clock();
// 渲染场景
function animate() {
  requestAnimationFrame(animate);
  // 更新动画混合器
  if (mixer) {
    mixer.update(clock.getDelta());
  }
  renderer.render(scene, camera);
  orb.update();
}





</script>
<template>
  <div class="container" ref="container"></div>
</template>
<style scoped lang="scss">
.container {
  width: 100vw;
  height: 100vh;
}
</style>