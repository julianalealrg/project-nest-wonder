/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as novoCadastroAdmin } from './novo-cadastro-admin.tsx'
import { template as cadastroAprovado } from './cadastro-aprovado.tsx'
import { template as cadastroRejeitado } from './cadastro-rejeitado.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'novo-cadastro-admin': novoCadastroAdmin,
  'cadastro-aprovado': cadastroAprovado,
  'cadastro-rejeitado': cadastroRejeitado,
}
