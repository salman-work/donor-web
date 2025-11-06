import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'
import React from 'react'
import { Label } from '@/components/ui/label'
import { Error } from '../Error'
import { Width } from '../Width'

export const FileField: React.FC<{
  name: string
  label?: string
  required?: boolean
  multiple?: boolean
  register: UseFormRegister<FieldValues>
  errors: Partial<FieldErrorsImpl>
}> = ({ name, label, required, multiple, register, errors }) => {
  return (
    <Width width={100}>
      <Label htmlFor={name}>
        {label}
        {required && (
          <span className="required">
            * <span className="sr-only">(required)</span>
          </span>
        )}
      </Label>
      <input id={name} type="file" multiple={Boolean(multiple)} {...register(name, { required })} />
      {errors[name] && <Error name={name} />}
    </Width>
  )
}
