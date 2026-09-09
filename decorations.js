const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function edge(ctx, width, height, thickness, color, bottom = thickness) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, thickness);
  ctx.fillRect(0, height - bottom, width, bottom);
  ctx.fillRect(0, thickness, thickness, height - thickness - bottom);
  ctx.fillRect(width - thickness, thickness, thickness, height - thickness - bottom);
}

function cloud(ctx, x, y, size, flip = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size * flip, size);
  ctx.beginPath();
  ctx.moveTo(-0.5, 0.12);
  ctx.bezierCurveTo(-0.72, 0.08, -0.64, -0.24, -0.4, -0.21);
  ctx.bezierCurveTo(-0.39, -0.52, 0.05, -0.61, 0.19, -0.27);
  ctx.bezierCurveTo(0.53, -0.43, 0.73, 0.05, 0.43, 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function heart(ctx, x, y, size, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, 0.42);
  ctx.bezierCurveTo(-0.85, -0.08, -0.4, -0.72, 0, -0.28);
  ctx.bezierCurveTo(0.4, -0.72, 0.85, -0.08, 0, 0.42);
  ctx.fill();
  ctx.restore();
}

function drawFrame(ctx, width, height, frame) {
  const unit = Math.min(width, height);
  ctx.save();
  switch (frame) {
    case 'manteiga':
      edge(ctx, width, height, unit * 0.031, '#ffe493');
      ctx.strokeStyle = '#fff7d8';
      ctx.lineWidth = unit * 0.004;
      ctx.strokeRect(unit * 0.015, unit * 0.015, width - unit * 0.03, height - unit * 0.03);
      break;
    case 'nuvens':
      edge(ctx, width, height, unit * 0.009, '#fffaf0');
      ctx.fillStyle = '#fffaf0';
      cloud(ctx, width * 0.066, height * 0.055, unit * 0.19);
      cloud(ctx, width * 0.94, height * 0.046, unit * 0.16, -1);
      cloud(ctx, width * 0.074, height * 0.995, unit * 0.22, -1);
      cloud(ctx, width * 0.92, height * 0.99, unit * 0.24);
      ctx.fillStyle = '#f4ce69';
      [ [0.13, 0.062], [0.91, 0.075], [0.85, 0.955] ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(width * x, height * y, unit * 0.0035, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    case 'polaroid': {
      const border = unit * 0.044;
      const bottom = Math.max(border * 2, height * 0.105);
      edge(ctx, width, height, border, '#fffdf4', bottom);
      break;
    }
    case 'coracoes': {
      const border = unit * 0.028;
      edge(ctx, width, height, border, '#fff5ec');
      const step = unit * 0.085;
      const size = unit * 0.017;
      ctx.fillStyle = '#eaa29b';
      for (let x = step * 0.6; x < width; x += step) {
        heart(ctx, x, border * 0.55, size, -0.15);
        heart(ctx, x, height - border * 0.48, size, 0.15);
      }
      for (let y = step * 0.9; y < height - step * 0.45; y += step) {
        heart(ctx, border * 0.52, y, size, -0.18);
        heart(ctx, width - border * 0.52, y, size, 0.18);
      }
      break;
    }
    default: break;
  }
  ctx.restore();
}

function resolveSticker(sticker, assets) {
  if (!assets) return null;
  const asset = typeof assets.get === 'function'
    ? assets.get(sticker.stickerId) || assets.get(sticker.src)
    : assets[sticker.stickerId] || assets[sticker.src];
  return asset?.image || asset || null;
}

function drawStickers(ctx, width, height, stickers, assets) {
  for (const sticker of stickers || []) {
    if (sticker.kind === 'text') { drawTextObject(ctx, width, height, sticker); continue; }
    const image = resolveSticker(sticker, assets);
    if (!image || (image instanceof HTMLImageElement && (!image.complete || !image.naturalWidth))) continue;
    const size = clamp(Number(sticker.size) || 0.22, 0.01, 3) * width;
    const naturalAspect = (image.naturalWidth || image.width || 1) / (image.naturalHeight || image.height || 1);
    const aspect = clamp(Number(sticker.aspect) || naturalAspect, 0.1, 10);
    const x = Number.isFinite(sticker.x) ? sticker.x : 0.5;
    const y = Number.isFinite(sticker.y) ? sticker.y : 0.5;
    ctx.save();
    ctx.translate(x * width, y * height);
    ctx.rotate((Number(sticker.rotation) || 0) * Math.PI / 180);
    ctx.scale(sticker.flipX ? -1 : 1, 1);
    ctx.drawImage(image, -size / 2, -size / aspect / 2, size, size / aspect);
    ctx.restore();
  }
}

export const TEXT_FONTS = { sans: 'Arial, sans-serif', serif: 'Georgia, serif', mono: 'Courier New, monospace', handwritten: 'cursive' };
export function textLayout(ctx, item) {
  ctx.save();
  ctx.font = `${item.italic ? 'italic ' : ''}${item.bold ? '700' : '400'} 64px ${TEXT_FONTS[item.font] || TEXT_FONTS.sans}`;
  const lines = String(item.text ?? '').slice(0, 240).split('\n');
  const width = Math.max(64, ...lines.map(line => ctx.measureText(line).width)) + 16;
  ctx.restore();
  return { lines, width, height: lines.length * 80 + 16 };
}
function drawTextObject(ctx, width, height, item) {
  const layout = textLayout(ctx, item), size = clamp(Number(item.size) || .5, .01, 3) * width;
  ctx.save(); ctx.translate(item.x * width, item.y * height);
  ctx.rotate((item.rotation || 0) * Math.PI / 180);
  ctx.scale(size / layout.width * (item.flipX ? -1 : 1), size / layout.width);
  ctx.font = `${item.italic ? 'italic ' : ''}${item.bold ? '700' : '400'} 64px ${TEXT_FONTS[item.font] || TEXT_FONTS.sans}`;
  ctx.fillStyle = item.color || '#fffdf4'; ctx.textAlign = item.align || 'center'; ctx.textBaseline = 'middle';
  if (item.shadow) { ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 3; }
  const x = item.align === 'left' ? -layout.width / 2 + 8 : item.align === 'right' ? layout.width / 2 - 8 : 0;
  layout.lines.forEach((line, i) => ctx.fillText(line, x, -layout.height / 2 + 48 + i * 80));
  ctx.restore();
}

function drawCaption(ctx, width, height, text, frame) {
  const caption = typeof text === 'string' ? text.trim().slice(0, 120) : '';
  if (!caption) return;
  const unit = Math.min(width, height);
  const bottom = frame === 'polaroid' ? height * 0.15 : height * 0.07;
  const fontSize = Math.max(14, unit * 0.043);
  ctx.save();
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#fffdf4';
  ctx.shadowColor = 'rgba(48, 34, 27, 0.65)';
  ctx.shadowBlur = unit * 0.012;
  ctx.shadowOffsetY = unit * 0.004;
  ctx.fillText(caption, width / 2, height - bottom, width * 0.86);
  ctx.restore();
}


export function drawDecorations(ctx,width,height,state,assets){drawFrame(ctx,width,height,state.frame);drawStickers(ctx,width,height,state.stickers,assets);drawCaption(ctx,width,height,state.caption,state.frame);}
