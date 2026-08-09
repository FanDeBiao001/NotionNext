/**
 * Shimeji 桌宠模型配置
 *
 * 模型格式：Spine骨骼动画 (.skel + .atlas + .png)
 * resourcePath: 模型资源根路径（支持远程URL或本地/public/models/路径）
 *
 * 添加新模型：在 MODELS 数组中追加
 * 自定义模型：设置环境变量 NEXT_PUBLIC_SHIMEJI_MODELS（JSON数组格式）
 */

const MODELS = [
  {
    id: 'char_1038_whitw2',
    name: '白面鸮',
    skeleton: 'build_char_1038_whitw2.skel',
    atlas: 'build_char_1038_whitw2.atlas',
    texture: 'build_char_1038_whitw2.png',
    resourcePath: 'https://raw.githubusercontent.com/fuyufjh/ArkPets-Web/main/assets/models/1038_whitw2/'
  },
  {
    id: 'char_4058_pepe',
    name: '佩佩',
    skeleton: 'build_char_4058_pepe.skel',
    atlas: 'build_char_4058_pepe.atlas',
    texture: 'build_char_4058_pepe.png',
    resourcePath: 'https://raw.githubusercontent.com/fuyufjh/ArkPets-Web/main/assets/models/4058_pepe/'
  },
  {
    id: 'char_4093_frston',
    name: '霜星',
    skeleton: 'build_char_4093_frston.skel',
    atlas: 'build_char_4093_frston.atlas',
    texture: 'build_char_4093_frston.png',
    resourcePath: 'https://raw.githubusercontent.com/fuyufjh/ArkPets-Web/main/assets/models/4093_frston/'
  },
  // 以下角色需从 ArkPets 模型包下载文件后，放入 public/shimeji/ 并改为远程 URL
  // {
  //   id: 'char_285_medic2',
  //   name: 'Lancet-2',
  //   skeleton: 'build_char_285_medic2.skel',
  //   atlas: 'build_char_285_medic2.atlas',
  //   texture: 'build_char_285_medic2.png',
  //   resourcePath: 'https://your-cdn.com/models/char_285_medic2/'
  // },
  // {
  //   id: 'char_278_orchid',
  //   name: 'Castle-3',
  //   skeleton: 'build_char_278_orchid.skel',
  //   atlas: 'build_char_278_orchid.atlas',
  //   texture: 'build_char_278_orchid.png',
  //   resourcePath: 'https://your-cdn.com/models/char_278_orchid/'
  // }
]

// Allow env override for custom models
let customModels = []
try {
  const envModels = process.env.NEXT_PUBLIC_SHIMEJI_MODELS
  if (envModels) {
    customModels = JSON.parse(envModels)
  }
} catch (e) {
  console.warn('[Shimeji] Invalid NEXT_PUBLIC_SHIMEJI_MODELS JSON')
}

export const SHIMEJI_MODELS = customModels.length > 0 ? customModels : MODELS
