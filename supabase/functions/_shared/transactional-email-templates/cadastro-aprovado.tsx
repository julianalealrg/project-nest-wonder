/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
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

const LOGIN_URL = 'https://pcp.nueprojetos.com.br/login'

interface CadastroAprovadoProps {
  nome?: string
}

const CadastroAprovadoEmail = ({ nome }: CadastroAprovadoProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu acesso ao Sistema PCP NUE foi aprovado</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>NUE</Heading>
        </Section>

        <Heading style={h1}>Bem-vindo(a) ao Sistema PCP</Heading>
        <Text style={text}>
          Olá {nome ?? ''}, seu cadastro foi aprovado! Você já pode acessar o
          sistema com seu email e senha cadastrados.
        </Text>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={LOGIN_URL}>
            Acessar o sistema
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>NUE Projetos — Sistema PCP</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CadastroAprovadoEmail,
  subject: 'Seu acesso ao Sistema PCP NUE foi aprovado',
  displayName: 'Cadastro aprovado',
  previewData: { nome: 'Maria' },
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
const button = {
  backgroundColor: '#0D0D0D',
  color: '#F0EDE8',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#CCC8C2', margin: '32px 0 16px' }
const footer = {
  fontSize: '12px',
  color: '#3D3D38',
  textAlign: 'center' as const,
  margin: '0',
}
