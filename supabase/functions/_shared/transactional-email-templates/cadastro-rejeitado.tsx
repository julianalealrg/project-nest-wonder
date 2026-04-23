/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CadastroRejeitadoProps {
  nome?: string
}

const CadastroRejeitadoEmail = ({ nome }: CadastroRejeitadoProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Solicitação de cadastro no Sistema PCP NUE</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>NUE</Heading>
        </Section>

        <Heading style={h1}>Sobre sua solicitação de cadastro</Heading>
        <Text style={text}>
          Olá {nome ?? ''}, sua solicitação de cadastro não foi aprovada neste
          momento. Para mais informações, entre em contato com o administrador
          do sistema.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>NUE Projetos — Sistema PCP</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CadastroRejeitadoEmail,
  subject: 'Solicitação de cadastro no Sistema PCP NUE',
  displayName: 'Cadastro rejeitado',
  previewData: { nome: 'Pedro' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Montserrat, Arial, sans-serif',
  color: '#0D0D0D',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
  backgroundColor: '#F0EDE8',
}
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const brand = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  letterSpacing: '4px',
  color: '#0D0D0D',
  margin: '0',
}
const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#0D0D0D',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#3D3D38',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const hr = { borderColor: '#CCC8C2', margin: '32px 0 16px' }
const footer = {
  fontSize: '12px',
  color: '#3D3D38',
  textAlign: 'center' as const,
  margin: '0',
}
