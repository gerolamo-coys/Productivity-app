'use client';

import React from 'react';
import {
  GraduationCap,
  Stethoscope,
  Layout,
  User,
  Briefcase,
  Code,
  BookOpen,
  Sparkles,
  Heart,
  Folder,
  Target,
  Rocket,
  Compass,
  Layers,
  Cpu,
  Coffee,
  Globe,
  LucideProps,
} from 'lucide-react';

export const AVAILABLE_ICONS = [
  { name: 'User', label: 'Pessoal / Vida', icon: User },
  { name: 'GraduationCap', label: 'Estudos / FATEC', icon: GraduationCap },
  { name: 'Stethoscope', label: 'Clínica / Saúde', icon: Stethoscope },
  { name: 'Layout', label: 'UI / Sistema Web', icon: Layout },
  { name: 'Code', label: 'Programação / Dev', icon: Code },
  { name: 'Briefcase', label: 'Trabalho / Carreira', icon: Briefcase },
  { name: 'BookOpen', label: 'Leitura / Conhecimento', icon: BookOpen },
  { name: 'Rocket', label: 'Projetos / Lançamentos', icon: Rocket },
  { name: 'Target', label: 'Metas / Foco', icon: Target },
  { name: 'Sparkles', label: 'IA / Criatividade', icon: Sparkles },
  { name: 'Heart', label: 'Saúde / Bem-estar', icon: Heart },
  { name: 'Coffee', label: 'Estilo de Vida / Lazer', icon: Coffee },
  { name: 'Cpu', label: 'Engenharia / Sistemas', icon: Cpu },
  { name: 'Globe', label: 'Online / Nuvem', icon: Globe },
  { name: 'Layers', label: 'Projetos Gerais', icon: Layers },
];

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  User,
  GraduationCap,
  Stethoscope,
  Layout,
  Code,
  Briefcase,
  BookOpen,
  Rocket,
  Target,
  Sparkles,
  Heart,
  Coffee,
  Cpu,
  Globe,
  Layers,
  Folder,
};

interface AreaIconProps extends LucideProps {
  name: string;
}

export function AreaIcon({ name, ...props }: AreaIconProps) {
  const IconComponent = ICON_MAP[name] || Folder;
  return <IconComponent {...props} />;
}
