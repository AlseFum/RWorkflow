#!/bin/bash
# 将同目录所有 .md 文件打包到 index.js

cd "$(dirname "$0")"

# 生成 index.js
cat > index.js << 'HEADER'
/** 由 index.sh 自动生成 不要手动修改*/

HEADER

# 生成 presets 对象
echo "export const presets = {" >> index.js

first_preset=true
for md in *.md; do
  [ -f "$md" ] || continue
  
  # 检查是否有 name frontmatter
  if grep -q "^name:" "$md" 2>/dev/null; then
    name="${md%.md}"
    
    # 提取 frontmatter 字段
    preset_name=$(grep "^name:" "$md" | sed 's/^name: *//' | tr -d '"' | tr -d "'")
    preset_icon=$(grep "^icon:" "$md" | sed 's/^icon: *//' | tr -d '"' | tr -d "'")
    preset_desc=$(grep "^description:" "$md" | sed 's/^description: *//' | tr -d '"' | tr -d "'")
    
    if [ "$first_preset" = true ]; then
      first_preset=false
    else
      echo "," >> index.js
    fi
    
    echo "  '$name': {" >> index.js
    echo "    name: '$preset_name'," >> index.js
    echo "    icon: '$preset_icon'," >> index.js
    echo "    description: '$preset_desc'," >> index.js
    echo "    md: \`" >> index.js
    sed 's/\\/\\\\/g; s/`/\\`/g; s/\$/\\$/g' "$md" >> index.js
    echo "\`" >> index.js
    echo -n "  }" >> index.js
  fi
done

echo "" >> index.js
echo "}" >> index.js

# 生成 docs 对象
echo "" >> index.js
echo "export const docs = {" >> index.js

first_doc=true
for md in *.md; do
  [ -f "$md" ] || continue
  
  # 跳过已经有 name frontmatter 的（已在 presets 中）
  if grep -q "^name:" "$md" 2>/dev/null; then
    continue
  fi
  
  name="${md%.md}"
  
  if [ "$first_doc" = true ]; then
    first_doc=false
  else
    echo "," >> index.js
  fi
  echo "  '$name': \`" >> index.js
  sed 's/\\/\\\\/g; s/`/\\`/g; s/\$/\\$/g' "$md" >> index.js
  echo "\`" >> index.js
done

echo "}" >> index.js

echo "Generated index.js with $(ls *.md 2>/dev/null | wc -l) markdown files"
