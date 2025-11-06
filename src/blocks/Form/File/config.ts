import type { Field, Block } from 'payload'

export const name: Field = {
  name: 'name',
  type: 'text',
  label: 'Name (lowercase, no special characters)',
  required: true,
}

export const label: Field = {
  name: 'label',
  type: 'text',
  label: 'Label',
  localized: true,
}
export const storageTarget: Field = {
  name: 'storageTarget',
  type: 'select',
  options: [
    {
      label: 'DonorNest (forward to external API)',
      value: 'donornest',
    },
    {
      label: 'Payload (store in Payload media)',
      value: 'payload',
    },
  ],
}

export const allowedMimeTypes: Field = {
  name: 'allowedMimeTypes',
  type: 'select',
  hasMany: true,
  options: [
    { label: 'image/jpeg', value: 'image/jpeg' },
    { label: 'image/png', value: 'image/png' },
    { label: 'image/webp', value: 'image/webp' },
    { label: 'image/gif', value: 'image/gif' },
    { label: 'application/pdf', value: 'application/pdf' },
  ],
}

export const maxFileSize: Field = {
  name: 'maxFileSize',
  type: 'text',
  label: 'Maximum File Size (bytes)',
}
export const multiple: Field = {
  name: 'multiple',
  type: 'checkbox',
  label: 'Allow Multiple Files',
}

export const required: Field = {
  name: 'required',
  type: 'checkbox',
  label: 'Required',
}

export const width: Field = {
  name: 'width',
  type: 'number',
  label: 'Field Width (percentage)',
}

export const FileBlock: Block = {
  slug: 'file',
  fields: [
    {
      type: 'row',
      fields: [
        {
          ...name,
          admin: {
            width: '50%',
          },
        },
        {
          ...label,
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          ...width,
          admin: {
            width: '50%',
          },
        },
        {
          ...maxFileSize,
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          ...storageTarget,
          admin: {
            width: '50%',
          },
        },
        {
          ...allowedMimeTypes,
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          ...multiple,
          admin: {
            width: '50%',
          },
        },
      ],
    },

    required,
  ],
  labels: {
    plural: 'Files',
    singular: 'File',
  },
}
