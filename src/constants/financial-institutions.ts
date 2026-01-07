export interface FinancialInstitution {
  id: string;
  name: string;
  color: string;
  type: 'bank' | 'digital' | 'wallet' | 'broker' | 'other';
  logoUrl?: string;
  domain?: string;
}

export const FINANCIAL_INSTITUTIONS: FinancialInstitution[] = [
  // Bancos Digitais
  { id: 'nubank', name: 'Nubank', color: '#820AD1', type: 'digital', domain: 'nubank.com.br', logoUrl: '/logos/nubank.svg' },
  { id: 'inter', name: 'Banco Inter', color: '#FF7A00', type: 'digital', domain: 'bancointer.com.br', logoUrl: '/logos/inter.svg' },
  { id: 'c6', name: 'C6 Bank', color: '#1A1A1A', type: 'digital', domain: 'c6bank.com.br', logoUrl: '/logos/c6.svg' },
  { id: 'next', name: 'Banco Next', color: '#00FF80', type: 'digital', domain: 'banconext.com.br', logoUrl: '/logos/next.svg' },
  { id: 'neon', name: 'Banco Neon', color: '#00E5A0', type: 'digital', domain: 'banconeon.com.br', logoUrl: '/logos/neon.svg' },
  { id: 'original', name: 'Banco Original', color: '#00A651', type: 'digital', domain: 'original.com.br', logoUrl: '/logos/original.svg' },
  { id: 'bs2', name: 'Banco BS2', color: '#00C1D4', type: 'digital', domain: 'bs2.com.br', logoUrl: '/logos/bs2.svg' },
  { id: 'sofisa', name: 'Sofisa Direto', color: '#FF6B00', type: 'digital', domain: 'sofisadireto.com.br', logoUrl: '/logos/sofisa.svg' },
  { id: 'will', name: 'Will Bank', color: '#FFCC00', type: 'digital', domain: 'willbank.com.br' },
  { id: 'iti', name: 'Iti Itaú', color: '#FF6600', type: 'digital', domain: 'iti.itau.com.br', logoUrl: '/logos/iti.svg' },
  { id: 'digio', name: 'Digio', color: '#003399', type: 'digital', domain: 'digio.com.br', logoUrl: '/logos/digio.svg' },
  { id: 'pan', name: 'Banco Pan', color: '#00AEEF', type: 'digital', domain: 'bancopan.com.br', logoUrl: '/logos/pan.svg' },
  { id: 'bmg', name: 'Banco BMG', color: '#E31837', type: 'digital', domain: 'bancobmg.com.br', logoUrl: '/logos/bmg.svg' },
  
  // Bancos Tradicionais
  { id: 'bb', name: 'Banco do Brasil', color: '#FEDF00', type: 'bank', domain: 'bb.com.br', logoUrl: '/logos/banco-do-brasil.svg' },
  { id: 'itau', name: 'Itaú Unibanco', color: '#FF6600', type: 'bank', domain: 'itau.com.br', logoUrl: '/logos/itau.svg' },
  { id: 'bradesco', name: 'Banco Bradesco', color: '#CC092F', type: 'bank', domain: 'bradesco.com.br', logoUrl: '/logos/bradesco.svg' },
  { id: 'santander', name: 'Santander Brasil', color: '#EC0000', type: 'bank', domain: 'santander.com.br', logoUrl: '/logos/santander.svg' },
  { id: 'caixa', name: 'Caixa Econômica Federal', color: '#0066B3', type: 'bank', domain: 'caixa.gov.br', logoUrl: '/logos/caixa.svg' },
  { id: 'safra', name: 'Banco Safra', color: '#003366', type: 'bank', domain: 'safra.com.br', logoUrl: '/logos/safra.svg' },
  { id: 'votorantim', name: 'Banco Votorantim', color: '#003399', type: 'bank', domain: 'bv.com.br', logoUrl: '/logos/bv.svg' },
  { id: 'banrisul', name: 'Banrisul', color: '#0033A0', type: 'bank', domain: 'banrisul.com.br', logoUrl: '/logos/banrisul.svg' },
  { id: 'brb', name: 'BRB', color: '#003087', type: 'bank', domain: 'brb.com.br', logoUrl: '/logos/brb.svg' },
  { id: 'banestes', name: 'Banestes', color: '#00529B', type: 'bank', domain: 'banestes.com.br', logoUrl: '/logos/banestes.svg' },
  { id: 'banese', name: 'Banese', color: '#003366', type: 'bank', domain: 'bfranco.com.br', logoUrl: '/logos/banese.svg' },
  { id: 'banpara', name: 'Banpará', color: '#006633', type: 'bank', domain: 'banpara.com.br', logoUrl: '/logos/banpara.svg' },
  
  // Cooperativas
  { id: 'sicoob', name: 'Sicoob', color: '#003641', type: 'bank', domain: 'sicoob.com.br', logoUrl: '/logos/sicoob.svg' },
  { id: 'sicredi', name: 'Sicredi', color: '#5FAA3F', type: 'bank', domain: 'sicredi.com.br', logoUrl: '/logos/sicredi.svg' },
  { id: 'unicred', name: 'Unicred', color: '#003366', type: 'bank', domain: 'unicred.com.br', logoUrl: '/logos/unicred.svg' },
  { id: 'cresol', name: 'Cresol', color: '#009944', type: 'bank', domain: 'cresol.com.br', logoUrl: '/logos/cresol.svg' },
  
  // Carteiras Digitais
  { id: 'mercadopago', name: 'Mercado Pago', color: '#00B1EA', type: 'wallet', domain: 'mercadopago.com.br', logoUrl: '/logos/mercado-pago.svg' },
  { id: 'picpay', name: 'PicPay', color: '#21C25E', type: 'wallet', domain: 'picpay.com.br', logoUrl: '/logos/picpay.svg' },
  { id: 'pagbank', name: 'PagBank', color: '#00DE93', type: 'wallet', domain: 'pagbank.com.br', logoUrl: '/logos/pagseguro.svg' },
  { id: 'pagseguro', name: 'PagSeguro', color: '#00DE93', type: 'wallet', domain: 'pagseguro.uol.com.br', logoUrl: '/logos/pagseguro.svg' },
  { id: 'paypal', name: 'PayPal', color: '#003087', type: 'wallet', domain: 'paypal.com', logoUrl: '/logos/paypal.svg' },
  { id: 'ame', name: 'Ame Digital', color: '#FF0066', type: 'wallet', domain: 'amedigital.com.br', logoUrl: '/logos/ame.svg' },
  { id: 'recargapay', name: 'RecargaPay', color: '#FF6600', type: 'wallet', domain: 'recargapay.com.br', logoUrl: '/logos/recarga-pay.svg' },
  { id: 'moip', name: 'Moip', color: '#00C0DA', type: 'wallet', domain: 'moip.com.br' },
  { id: '99pay', name: '99Pay', color: '#FFCC00', type: 'wallet', domain: '99app.com', logoUrl: '/logos/99-pay.svg' },
  { id: 'uber', name: 'Uber', color: '#000000', type: 'wallet', domain: 'uber.com' },
  { id: 'ifood', name: 'iFood', color: '#EA1D2C', type: 'wallet', domain: 'ifood.com.br' },
  { id: 'rappi', name: 'Rappi', color: '#FF441F', type: 'wallet', domain: 'rappi.com.br', logoUrl: '/logos/rappi-bank.svg' },
  
  // Corretoras/Investimentos
  { id: 'xp', name: 'XP Investimentos', color: '#FFCD00', type: 'broker', domain: 'xpi.com.br', logoUrl: '/logos/xp.svg' },
  { id: 'btg', name: 'BTG Pactual', color: '#000D3D', type: 'broker', domain: 'btgpactual.com.br', logoUrl: '/logos/btg-pactual.svg' },
  { id: 'clear', name: 'Clear Corretora', color: '#00C8FF', type: 'broker', domain: 'clear.com.br', logoUrl: '/logos/clear.svg' },
  { id: 'rico', name: 'Rico Investimentos', color: '#FF6600', type: 'broker', domain: 'rico.com.br', logoUrl: '/logos/rico.svg' },
  { id: 'modal', name: 'Banco Modal', color: '#000000', type: 'broker', domain: 'modalmais.com.br' },
  { id: 'genial', name: 'Genial Investimentos', color: '#00BFFF', type: 'broker', domain: 'genialinvestimentos.com.br', logoUrl: '/logos/genial-investimentos.svg' },
  { id: 'avenue', name: 'Avenue', color: '#4A90D9', type: 'broker', domain: 'avenue.us', logoUrl: '/logos/avenue.svg' },
  { id: 'toro', name: 'Toro Investimentos', color: '#00C853', type: 'broker', domain: 'toroinvestimentos.com.br' },
  { id: 'warren', name: 'Warren', color: '#E91E63', type: 'broker', domain: 'warren.com.br' },
  { id: 'easynvest', name: 'Easynvest', color: '#FF6600', type: 'broker', domain: 'easynvest.com.br', logoUrl: '/logos/nu-invest.svg' },
  { id: 'orama', name: 'Órama', color: '#7B68EE', type: 'broker', domain: 'orama.com.br' },
  { id: 'guide', name: 'Guide Investimentos', color: '#003366', type: 'broker', domain: 'guideinvestimentos.com.br' },
  { id: 'agora', name: 'Ágora Investimentos', color: '#003399', type: 'broker', domain: 'agorainvestimentos.com.br' },
  { id: 'mirae', name: 'Mirae Asset', color: '#FF6600', type: 'broker', domain: 'miraeasset.com.br' },
  
  // Genéricos (sem logo)
  { id: 'carteira', name: 'Carteira', color: '#22c55e', type: 'other' },
  { id: 'cofre', name: 'Cofre', color: '#64748b', type: 'other' },
  { id: 'outro', name: 'Outro', color: '#6366f1', type: 'other' },
];

export const getInstitutionById = (id: string): FinancialInstitution | undefined => {
  return FINANCIAL_INSTITUTIONS.find(inst => inst.id === id);
};

export const getInstitutionByName = (name: string): FinancialInstitution | undefined => {
  return FINANCIAL_INSTITUTIONS.find(
    inst => inst.name.toLowerCase() === name.toLowerCase()
  );
};

export const getInstitutionInitials = (name: string): string => {
  const words = name.split(' ');
  if (words.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};
