import { Image as ImageIcon } from 'lucide-react';
import type { ComponentDef } from '../core/types';

const placeholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#123a63"/><stop offset="1" stop-color="#0a1a30"/>' +
    '</linearGradient></defs>' +
    '<rect width="100%" height="100%" fill="url(#g)"/>' +
    '<text x="50%" y="53%" fill="#3d6f9e" font-family="sans-serif" font-size="26" text-anchor="middle">IMAGE</text>' +
    '</svg>',
)}`;

export const imageComponent: ComponentDef = {
  type: 'image',
  name: '图片',
  category: 'media',
  icon: ImageIcon,
  defaultSize: { w: 480, h: 270 },
  defaultProps: {
    src: placeholder,
    fit: 'cover',
    radius: 6,
  },
  fields: [
    { key: 'src', label: '图片地址', type: 'textarea', rows: 2, placeholder: 'https://... 或 data URI' },
    {
      key: 'fit',
      label: '填充方式',
      type: 'select',
      options: [
        { label: '裁切铺满 cover', value: 'cover' },
        { label: '完整显示 contain', value: 'contain' },
        { label: '拉伸 fill', value: 'fill' },
      ],
    },
    { key: 'radius', label: '圆角', type: 'number', min: 0, max: 200, suffix: 'px' },
  ],
  render: ({ node }) => {
    const p = node.props;
    return (
      <img
        src={p.src || placeholder}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: p.fit, borderRadius: p.radius, display: 'block' }}
      />
    );
  },
};
