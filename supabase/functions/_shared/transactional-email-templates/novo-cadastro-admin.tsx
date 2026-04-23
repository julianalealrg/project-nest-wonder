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

const SITE_NAME = 'Sistema PCP NUE'
const ADMIN_URL = 'https://pcp.nueprojetos.com.br/admin'

interface NovoCadastroAdminProps {
  nome?: string
  sobrenome?: string
  email?: string
  funcao?: string
  base?: string
  dataSolicitacao?: string
}

const NovoCadastroAdminEmail = ({
  nome,
  sobrenome,
  email,
  funcao,
  base,
  dataSolicitacao,
}: NovoCadastroAdminProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo cadastro aguardando aprovação no Sistema PCP NUE</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>NUE</Heading>
        </Section>

        <Heading style={h1}>Novo cadastro aguardando aprovação</Heading>
        <Text style={text}>
          Um novo usuário solicitou acesso ao {SITE_NAME}. Revise os dados
          abaixo e aprove ou rejeite a solicitação.
        </Text>

        <Section style={dataBox}>
          <Row label="Nome" value={`${nome ?? ''} ${sobrenome ?? ''}`.trim() || '—'} />
          <Row label="Email" value={email ?? '—'} />
          <Row label="Função" value={funcao ?? '—'} />
          <Row label="Base" value={base ?? '—'} />
          <Row label="Data" value={dataSolicitacao ?? '—'} />
        </Section>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={ADMIN_URL}>
            Aprovar no sistema
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>NUE Projetos — Sistema PCP</Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <Text style={rowText}>
    <span style={rowLabel}>{label}: </span>
    <span style={rowValue}>{value}</span>
  </Text>
)

export const template = {
  component: NovoCadastroAdminEmail,
  subject: 'Nova solicitação de cadastro — Sistema PCP NUE',
  displayName: 'Notificação de novo cadastro (admin)',
  to: 'julianaguerra@nuesuperficies.com.br',
  previewData: {
    nome: 'João',
    sobrenome: 'Silva',
    email: 'joao.silva@example.com',
    funcao: 'PCP Entrada',
    base: 'Base 2',
    dataSolicitacao: '23/04/2026 14:32',
  },
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
const dataBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #CCC8C2',
  borderRadius: '4px',
  padding: '16px 20px',
  margin: '20px 0',
}
const rowText = { fontSize: '14px', margin: '6px 0', lineHeight: '1.5' }
const rowLabel = { color: '#3D3D38', fontWeight: '600' as const }
const rowValue = { color: '#0D0D0D' }
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
