import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin, Field } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { UtilityPole } from 'lucide-react'
import util from 'util'
import { DateOfBirth } from '@/blocks/Form/blocks'
import { FileField } from '@/blocks/Form/File'
import { FileBlock } from '@/blocks/Form/File/config'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Website Template` : 'Payload Website Template'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
      dateOfBirth: DateOfBirth,
      file: FileBlock,
    },
    formOverrides: {
      // @ts-expect-error - customizing form builder default fields; types are complex and we assert this override is valid
      fields: ({ defaultFields }) => {
        const mapped = defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          // Enhance the `fields` array for form builder to allow file field configuration
          if ('name' in field && field.name === 'fields') {
            const existing = (field as { fields?: Field[] }).fields ?? []

            return {
              ...field,
              // Append admin configuration options for file fields
              fields: [
                ...existing,
                // Storage target selector for file fields
                {
                  name: 'storageTarget',
                  label: 'File storage target',
                  type: 'select',
                  admin: {
                    description: 'Choose where uploaded files should be stored for this field.',
                    condition: (_data: unknown, siblingData: unknown) =>
                      (siblingData as { blockType?: string } | undefined)?.blockType === 'file',
                  },
                  options: [
                    { label: 'DonorNest (forward to external API)', value: 'donornest' },
                    { label: 'Payload (store in Payload media)', value: 'payload' },
                  ],
                  defaultValue: 'donornest',
                },
                // Allowed MIME types
                {
                  name: 'allowedMimeTypes',
                  label: 'Allowed MIME types',
                  type: 'select',
                  hasMany: true,
                  admin: {
                    description:
                      'Select allowed MIME types for uploads. Leave blank to use site defaults (configured in .env).',
                    condition: (_data: unknown, siblingData: unknown) =>
                      (siblingData as { blockType?: string } | undefined)?.blockType === 'file',
                  },
                  options: [
                    { label: 'image/jpeg', value: 'image/jpeg' },
                    { label: 'image/png', value: 'image/png' },
                    { label: 'image/webp', value: 'image/webp' },
                    { label: 'image/gif', value: 'image/gif' },
                    { label: 'application/pdf', value: 'application/pdf' },
                  ],
                },
                // Max file size
                {
                  name: 'maxFileSize',
                  label: 'Max file size (bytes)',
                  type: 'number',
                  admin: {
                    description:
                      'Maximum file size in bytes. Leave blank to use site default (e.g. 5242880).',
                    condition: (_data: unknown, siblingData: unknown) =>
                      (siblingData as { blockType?: string } | undefined)?.blockType === 'file',
                  },
                },
                // Allow multiple
                {
                  name: 'multiple',
                  label: 'Allow multiple files',
                  type: 'checkbox',
                  admin: {
                    description: 'If checked, the form field will accept multiple files.',
                    condition: (_data: unknown, siblingData: unknown) =>
                      (siblingData as { blockType?: string } | undefined)?.blockType === 'file',
                  },
                },
              ],
            }
          }
          return field
        })
        return mapped
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
  payloadCloudPlugin(),
]
