
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'observador');

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  base TEXT NOT NULL DEFAULT 'Gestão',
  funcao TEXT,
  perfil app_role NOT NULL DEFAULT 'operador',
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ CLIENTES ============
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  contato TEXT,
  supervisor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);

-- ============ TERCEIROS ============
CREATE TABLE public.terceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contato TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.terceiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read terceiros" ON public.terceiros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert terceiros" ON public.terceiros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update terceiros" ON public.terceiros FOR UPDATE TO authenticated USING (true);

-- ============ ORDENS DE SERVIÇO ============
CREATE TABLE public.ordens_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  ambiente TEXT,
  material TEXT,
  projetista TEXT,
  area_m2 NUMERIC,
  data_emissao DATE,
  data_entrega DATE,
  status TEXT NOT NULL DEFAULT 'recebida',
  localizacao TEXT,
  terceiro_id UUID REFERENCES public.terceiros(id),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read os" ON public.ordens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert os" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update os" ON public.ordens_servico FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_os_updated_at BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PEÇAS ============
CREATE TABLE public.pecas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
  item TEXT,
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  comprimento NUMERIC,
  largura NUMERIC,
  precisa_45 BOOLEAN DEFAULT false,
  precisa_poliborda BOOLEAN DEFAULT false,
  precisa_usinagem BOOLEAN DEFAULT false,
  status_corte TEXT DEFAULT 'pendente',
  cortador TEXT,
  status_45 TEXT DEFAULT 'pendente',
  operador_45 TEXT,
  status_poliborda TEXT DEFAULT 'pendente',
  operador_poliborda TEXT,
  status_usinagem TEXT DEFAULT 'pendente',
  operador_usinagem TEXT,
  status_acabamento TEXT DEFAULT 'pendente',
  acabador TEXT,
  cabine TEXT,
  status_cq TEXT DEFAULT 'pendente',
  cq_aprovado BOOLEAN,
  cq_responsavel TEXT,
  cq_observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pecas" ON public.pecas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pecas" ON public.pecas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pecas" ON public.pecas FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_pecas_updated_at BEFORE UPDATE ON public.pecas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ROMANEIOS ============
CREATE TABLE public.romaneios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  tipo_rota TEXT NOT NULL,
  motorista TEXT,
  ajudante TEXT,
  endereco_destino TEXT,
  data_saida TIMESTAMP WITH TIME ZONE,
  data_recebimento TIMESTAMP WITH TIME ZONE,
  recebido_por TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.romaneios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read romaneios" ON public.romaneios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert romaneios" ON public.romaneios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update romaneios" ON public.romaneios FOR UPDATE TO authenticated USING (true);

-- ============ ROMANEIO_PECAS ============
CREATE TABLE public.romaneio_pecas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  romaneio_id UUID REFERENCES public.romaneios(id) ON DELETE CASCADE NOT NULL,
  peca_id UUID REFERENCES public.pecas(id) NOT NULL,
  os_id UUID REFERENCES public.ordens_servico(id),
  conferencia TEXT DEFAULT 'pendente',
  observacao TEXT
);
ALTER TABLE public.romaneio_pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read romaneio_pecas" ON public.romaneio_pecas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert romaneio_pecas" ON public.romaneio_pecas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update romaneio_pecas" ON public.romaneio_pecas FOR UPDATE TO authenticated USING (true);

-- ============ REGISTROS ============
CREATE TABLE public.registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  origem TEXT NOT NULL,
  os_id UUID REFERENCES public.ordens_servico(id),
  numero_os TEXT,
  cliente TEXT,
  material TEXT,
  ambiente TEXT,
  supervisor TEXT,
  projetista TEXT,
  tipo TEXT,
  tipo_outro TEXT,
  urgencia TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'aberto',
  justificativa TEXT,
  responsavel_erro_papel TEXT,
  responsavel_erro_nome TEXT,
  acabador_responsavel TEXT,
  encaminhar_projetos BOOLEAN DEFAULT false,
  instrucao_projetos TEXT,
  requer_recolha BOOLEAN DEFAULT false,
  recolha_origem TEXT,
  recolha_destino TEXT,
  aberto_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read registros" ON public.registros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert registros" ON public.registros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update registros" ON public.registros FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_registros_updated_at BEFORE UPDATE ON public.registros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REGISTRO_PECAS ============
CREATE TABLE public.registro_pecas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES public.registros(id) ON DELETE CASCADE NOT NULL,
  item TEXT,
  descricao TEXT,
  quantidade INTEGER DEFAULT 1,
  medida_atual TEXT,
  medida_necessaria TEXT,
  nao_consta_os BOOLEAN DEFAULT false
);
ALTER TABLE public.registro_pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read registro_pecas" ON public.registro_pecas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert registro_pecas" ON public.registro_pecas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update registro_pecas" ON public.registro_pecas FOR UPDATE TO authenticated USING (true);

-- ============ EVIDENCIAS ============
CREATE TABLE public.evidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES public.registros(id) ON DELETE CASCADE NOT NULL,
  url_foto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read evidencias" ON public.evidencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert evidencias" ON public.evidencias FOR INSERT TO authenticated WITH CHECK (true);

-- ============ ACTIVITY_LOGS ============
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_description TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============ SYSTEM_LISTS ============
CREATE TABLE public.system_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.system_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read system_lists" ON public.system_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage system_lists" ON public.system_lists FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ POPULAR SYSTEM_LISTS ============
INSERT INTO public.system_lists (tipo, valor) VALUES
  ('tipo_peca', 'Bancada'), ('tipo_peca', 'Balcão'), ('tipo_peca', 'Testeira'),
  ('tipo_peca', 'Encabeçamento'), ('tipo_peca', 'Montante'), ('tipo_peca', 'Vira Montante'),
  ('tipo_peca', 'Respaldo'), ('tipo_peca', 'Prateleira'), ('tipo_peca', 'Nicho'),
  ('tipo_peca', 'Divibox'), ('tipo_peca', 'Rodamóvel'), ('tipo_peca', 'Rodapé'),
  ('tipo_peca', 'Revestimento'), ('tipo_peca', 'Piso'), ('tipo_peca', 'Soleira'),
  ('tipo_peca', 'Portal'), ('tipo_peca', 'Chapim'), ('tipo_peca', 'Filetes'),
  ('tipo_peca', 'Mesa'), ('tipo_peca', 'Painel'), ('tipo_peca', 'Cuba Esculpida'),
  ('tipo_peca', 'Moldura'), ('tipo_peca', 'Shaft'),
  ('ambiente', 'Cozinha'), ('ambiente', 'Área de Serviço'), ('ambiente', 'Lavanderia'),
  ('ambiente', 'BWC Casal'), ('ambiente', 'BWC Social'), ('ambiente', 'BWC Suíte'),
  ('ambiente', 'BWC Funcional'), ('ambiente', 'Lavabo'), ('ambiente', 'Sala Estar'),
  ('ambiente', 'Sala Jantar'), ('ambiente', 'Sala TV'), ('ambiente', 'Varanda'),
  ('ambiente', 'Gourmet'), ('ambiente', 'Quarto'), ('ambiente', 'Suíte'),
  ('ambiente', 'Closet'), ('ambiente', 'Escritório'), ('ambiente', 'Hall'),
  ('ambiente', 'Garagem'), ('ambiente', 'Piscina'), ('ambiente', 'Adega'), ('ambiente', 'Fachada');
