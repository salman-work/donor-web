import { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'

export const Cars: CollectionConfig<'cars'> = {
  slug: 'cars',
  access: {
    read: () => true,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'featuredImage', 'updatedAt'],
    useAsTitle: 'title',
  },
  defaultPopulate: {
    title: true,
    slug: true,
    featuredImage: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    ...slugField(),
  ],
}
