// Vídeos da câmera (menu e transição pro 40 anos), hospedados no Cloudinary
// pra não pesar na cota de download do Firebase Hosting. As URLs não têm
// transformações (f_auto, q_auto...) de propósito: o Cloudinary entrega o
// arquivo original, que é o que preserva o fundo transparente.
//   .webm (VP9 com alpha)  → Chrome, Firefox, Android
//   .mov  (HEVC com alpha) → Safari
export const CAMERA_WEBM = 'https://res.cloudinary.com/dujk5aswk/video/upload/v1792153000/site/camera-rotation-alpha-webm.webm'
export const CAMERA_MOV  = 'https://res.cloudinary.com/dujk5aswk/video/upload/v1792153001/site/camera-rotation-alpha-mov.mov'
