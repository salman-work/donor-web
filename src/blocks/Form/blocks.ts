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

export const DateOfBirth: Block = {
  slug: 'dateOfBirth',
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
          name: 'defaultValue',
          type: 'text',
          label: 'Default Value',
          admin: {
            width: '50%',
          },
        },
      ],
    },
    required,
  ],
  labels: {
    plural: 'Date of Birth Fields',
    singular: 'Date of Birth',
  },
}
