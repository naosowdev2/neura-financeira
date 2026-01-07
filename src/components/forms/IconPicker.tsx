import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  Utensils, Coffee, Pizza, ShoppingCart, Store, Apple, UtensilsCrossed, Wine, Sandwich, IceCream,
  Beef, Croissant, Cookie, Cake, CupSoda, Beer, Milk, Salad, Soup, Egg, Fish, Cherry, Grape,
  Citrus, Banana, Carrot, Wheat, Candy, Popcorn, Car, Bus, Train, Bike, Fuel, Plane, Ship, Truck,
  CarTaxiFront, Sailboat, Rocket, Tractor, CircleParking, TrainFront, Ambulance, CarFront,
  Forklift, Container, PlaneTakeoff, PlaneLanding, TrainTrack, Gauge, Navigation2, Home, Lightbulb,
  Droplets, Wifi, Wrench, Sofa, Key, Bed, Bath, Lamp, DoorOpen, DoorClosed, Fence, Refrigerator,
  WashingMachine, AirVent, Heater, Plug, Fan, Lock, Building, House, Warehouse, TreeDeciduous,
  Blinds, LampDesk, LampFloor, LampCeiling, SquareStack, Frame, Image, Heart, Pill, Stethoscope,
  Activity, Hospital, Syringe, Thermometer, Brain, Eye, Ear, Hand, Bone, Accessibility, HeartPulse,
  Cross, ShieldPlus, Bandage, Microscope, TestTube, Dna, Scan, CircleOff, HeartCrack, BrainCircuit,
  BrainCog, Gamepad2, Film, Music, Book, Camera, Tv, Headphones, Dice1, Dice5, Puzzle, Palette,
  Paintbrush, Theater, Clapperboard, Radio, Podcast, BookOpen, Library, PartyPopper, Wand2, Drama,
  Telescope, Binoculars, Tent, Mountain, Compass, Map, Gamepad, Joystick, Cctv, Piano, Guitar, Drum,
  Briefcase, Laptop, Building2, GraduationCap, PenTool, FileText, Presentation, Calendar, Clock,
  Timer, CalendarDays, Notebook, NotebookPen, ClipboardList, ClipboardCheck, Stamp, Paperclip,
  BookMarked, Award, Badge, BadgeCheck, Users, UserPlus, UserCheck, Contact, IdCard, Projector,
  LayoutDashboard, Layers, Component, Blocks, Combine, Network, FolderKanban, FolderCog, UserCog,
  Settings2, Wallet, CreditCard, Banknote, PiggyBank, TrendingUp, Receipt, Coins, DollarSign, Euro,
  Bitcoin, CircleDollarSign, Landmark, BarChart3, BarChart4, LineChart, PieChart, TrendingDown,
  Calculator, Percent, Scale, ArrowUpDown, Repeat, BadgeDollarSign, HandCoins, CirclePercent,
  BadgePercent, ReceiptText, FileSpreadsheet, ClipboardPenLine, ChartNoAxesCombined, ChartPie,
  ChartBar, ChartLine, ChartSpline, ChartArea, Dumbbell, Trophy, Target, Medal, Volleyball, Dribbble,
  Goal, Flame, Footprints, PersonStanding, Waves, Snowflake, Wind, Zap, Crown, Swords, Waypoints,
  Scaling, Baby, Dog, Cat, Scissors, Shirt, Watch, User, UserCircle, Users2, Gem, Glasses, Armchair,
  Brush, SprayCan, ShowerHead, Sparkle, Sparkles, CircleUser, UserRound, UserRoundCog, Smile, SmilePlus, Frown,
  Angry, Meh, CircleUserRound, Phone, Smartphone, Monitor, Printer, Cpu, HardDrive, Server, Usb,
  Bluetooth, Signal, Antenna, Keyboard, Mouse, Tablet, TabletSmartphone, Cable, Battery,
  BatteryCharging, Power, Settings, Globe, Cloud, CloudDownload, CloudUpload, Download, Upload, Link,
  Share2, QrCode, Nfc, WifiOff, WifiHigh, WifiLow, WifiZero, MonitorSmartphone, MonitorSpeaker,
  ScreenShare, ScreenShareOff, DatabaseBackup, Database, DatabaseZap, ServerCog, ServerCrash,
  CircuitBoard, MemoryStick, Router, SatelliteDish, Trees, Flower2, Sun, Umbrella, Moon, CloudRain,
  CloudSun, Rainbow, Leaf, Sprout, Bug, Snail, Bird, Squirrel, Rabbit, Turtle, Palmtree, Clover,
  Shrub, Flower, TreePine, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, Cloudy, Droplet, Hammer,
  Shovel, Axe, Drill, PaintBucket, Ruler, Paintbrush2, HardHat, Pickaxe, Construction, BrickWall,
  Pipette, Mail, MailOpen, Send, MessageSquare, MessageCircle, PhoneCall, Video, Voicemail, AtSign,
  Bell, BellRing, Megaphone, Rss, Hash, MessageSquarePlus, MessageCircleMore, MailPlus, MailCheck,
  MailX, MailWarning, PhoneOutgoing, PhoneIncoming, PhoneMissed, PhoneForwarded, PhoneOff, VideoOff,
  BellOff, BellPlus, BellMinus, Mails, Inbox, Shield, ShieldCheck, ShieldAlert, Unlock, KeyRound,
  Fingerprint, ScanFace, EyeOff, AlertTriangle, AlertCircle, Ban, XCircle, CheckCircle, ShieldOff,
  ShieldQuestion, ShieldX, LockKeyhole, LockOpen, KeySquare, ScanEye, ScanLine, ScanSearch, ScanText,
  AlertOctagon, TriangleAlert, OctagonAlert, OctagonX, CircleAlert, Luggage, MapPin, Navigation, Route,
  Hotel, Ticket, Flag, Signpost, MountainSnow, Backpack, MapPinned, MapPinOff, MapPinPlus, MapPinCheck,
  MapPinX, Milestone, Tag, Star, Gift, ShoppingBag, Package, Sparkles as SparklesIcon2, Barcode, Box, PackageOpen,
  PackageCheck, Boxes, PackagePlus, PackageMinus, PackageX, PackageSearch, ShoppingBasket, Tags,
  BadgeX, BadgePlus, School, BookText, BookCopy, Bookmark, Languages, FileQuestion, PenLine,
  Highlighter, Eraser, Triangle, CircleDot, Square, Pentagon, BookOpenCheck, BookA, BookAudio,
  BookCheck, BookDashed, BookDown, BookHeadphones, BookHeart, BookImage, BookKey, BookLock, BookMinus,
  BookOpenText, BookPlus, BookType, BookUp, BookUser, BookX, NotebookText, NotebookTabs, Music2,
  Music3, Music4, Mic, Mic2, MicOff, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Disc, Disc3,
  ListMusic, AudioWaveform, AudioLines, PlayCircle, PauseCircle, StopCircle, FastForward, Rewind,
  Repeat1, Shuffle, Volume, Volume1, VolumeOff, Speaker, File, FileImage, FileVideo,
  FileAudio, FileCode, FileJson, Folder, FolderOpen, FolderPlus, Archive, Trash2, Save, Undo, Redo,
  Copy, ClipboardCopy, FilePlus, FileMinus, FileX, FileCheck, FileClock, FileSearch, FileWarning,
  FolderMinus, FolderX, FolderCheck, FolderSearch, FolderClosed, FolderArchive, FolderDot, FolderGit,
  FolderGit2, FolderHeart, FolderInput, FolderKey, FolderLock, FolderOutput, FolderPen, FolderRoot,
  FolderSymlink, FolderSync, FolderTree, FolderUp, ThumbsUp, ThumbsDown, MessageSquareMore, Quote, Share,
  HeartHandshake, Handshake, MessageSquareHeart, MessageSquareShare, MessagesSquare, Hourglass,
  CalendarClock, History, TimerReset, Sunrise, Sunset, AlarmClock, Clock3, Clock12, CalendarCheck,
  CalendarCheck2, CalendarMinus, CalendarPlus, CalendarX, CalendarRange, CalendarSearch, CalendarHeart,
  CalendarOff, CalendarFold, Clock1, Clock2, Clock4, Clock5, Clock6, Clock7, Clock8, Clock9, Clock10,
  Clock11, TimerOff, Search, SearchCheck, SearchCode, SearchSlash, SearchX, Bot, BotMessageSquare,
  Terminal, SquareTerminal, Braces, Recycle, Newspaper, Satellite, Plus, Minus, X, Check, Equal,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsUp, ChevronsDown, MoreHorizontal, MoreVertical, Grip, GripVertical, Menu, LayoutGrid, List,
  Grid3X3, Columns, Rows, Table, Kanban, Workflow, GitBranch, GitMerge, Infinity, Binary, Anchor,
  Feather, Asterisk, CirclePlus, CircleMinus, CircleX, CircleCheck, CircleArrowUp, CircleArrowDown,
  CircleArrowLeft, CircleArrowRight, SquarePlus, SquareMinus, SquareX, SquareCheck, SquareArrowUp,
  SquareArrowDown, SquareArrowLeft, SquareArrowRight, Hexagon, Octagon, Circle, Diamond, Shapes,
  Cuboid, Cylinder, Cone, Pyramid, Code, CodeXml, Cog,
  type LucideIcon
} from "lucide-react";

export interface IconOption {
  name: string;
  icon: LucideIcon;
  keywords: string[];
}

const ICON_CATEGORIES: { name: string; icons: IconOption[] }[] = [
  {
    name: "Alimentação",
    icons: [
      { name: "utensils", icon: Utensils, keywords: ["comida", "restaurante", "refeição"] },
      { name: "coffee", icon: Coffee, keywords: ["café", "bebida"] },
      { name: "pizza", icon: Pizza, keywords: ["fast food", "lanche"] },
      { name: "shopping-cart", icon: ShoppingCart, keywords: ["mercado", "compras", "supermercado"] },
      { name: "store", icon: Store, keywords: ["loja", "mercado"] },
      { name: "apple", icon: Apple, keywords: ["fruta", "saudável"] },
      { name: "utensils-crossed", icon: UtensilsCrossed, keywords: ["restaurante", "jantar"] },
      { name: "wine", icon: Wine, keywords: ["bebida", "bar", "vinho"] },
      { name: "sandwich", icon: Sandwich, keywords: ["lanche", "fast food"] },
      { name: "ice-cream", icon: IceCream, keywords: ["sobremesa", "doce", "sorvete"] },
      { name: "beef", icon: Beef, keywords: ["carne", "churrasco", "proteína"] },
      { name: "croissant", icon: Croissant, keywords: ["padaria", "pão", "café da manhã"] },
      { name: "cookie", icon: Cookie, keywords: ["biscoito", "doce", "lanche"] },
      { name: "cake", icon: Cake, keywords: ["bolo", "sobremesa", "aniversário"] },
      { name: "cup-soda", icon: CupSoda, keywords: ["refrigerante", "bebida", "suco"] },
      { name: "beer", icon: Beer, keywords: ["cerveja", "bar", "bebida"] },
      { name: "milk", icon: Milk, keywords: ["leite", "laticínios", "bebida"] },
      { name: "salad", icon: Salad, keywords: ["salada", "saudável", "vegetais"] },
      { name: "soup", icon: Soup, keywords: ["sopa", "caldo", "quente"] },
      { name: "egg", icon: Egg, keywords: ["ovo", "café da manhã", "proteína"] },
      { name: "fish", icon: Fish, keywords: ["peixe", "frutos do mar", "sushi"] },
      { name: "cherry", icon: Cherry, keywords: ["cereja", "fruta", "doce"] },
      { name: "grape", icon: Grape, keywords: ["uva", "fruta", "vinho"] },
      { name: "citrus", icon: Citrus, keywords: ["laranja", "limão", "cítrico"] },
      { name: "banana", icon: Banana, keywords: ["banana", "fruta", "potássio"] },
      { name: "carrot", icon: Carrot, keywords: ["cenoura", "vegetal", "legume"] },
      { name: "wheat", icon: Wheat, keywords: ["trigo", "pão", "grãos", "padaria"] },
      { name: "candy", icon: Candy, keywords: ["doce", "bala", "guloseima"] },
      { name: "popcorn", icon: Popcorn, keywords: ["pipoca", "cinema", "lanche"] },
    ],
  },
  {
    name: "Serviços",
    icons: [
      { name: "scissors-services", icon: Scissors, keywords: ["salão", "cabeleireiro", "barbearia", "corte"] },
      { name: "spray-can-services", icon: SprayCan, keywords: ["estética", "beleza", "cosmético", "spa"] },
      { name: "car-services", icon: Car, keywords: ["mecânico", "oficina", "auto", "carro"] },
      { name: "wrench-services", icon: Wrench, keywords: ["encanador", "manutenção", "reparo", "conserto"] },
      { name: "plug-services", icon: Plug, keywords: ["eletricista", "elétrica", "instalação"] },
      { name: "droplets-services", icon: Droplets, keywords: ["lavanderia", "limpeza", "lavagem"] },
      { name: "shower-head-services", icon: ShowerHead, keywords: ["encanamento", "hidráulica", "água"] },
      { name: "wifi-services", icon: Wifi, keywords: ["internet", "provedor", "técnico", "rede"] },
      { name: "phone-services", icon: Phone, keywords: ["telefonia", "operadora", "celular", "plano"] },
      { name: "building-services", icon: Building2, keywords: ["condomínio", "administração", "síndico"] },
      { name: "home-services", icon: Home, keywords: ["diarista", "faxina", "limpeza", "doméstico"] },
      { name: "truck-services", icon: Truck, keywords: ["mudança", "frete", "transporte", "entrega"] },
      { name: "clipboard-services", icon: ClipboardList, keywords: ["consultoria", "assessoria", "projeto"] },
      { name: "users-services", icon: Users, keywords: ["rh", "recrutamento", "pessoal", "equipe"] },
      { name: "dog-services", icon: Dog, keywords: ["pet shop", "banho", "tosa", "veterinário"] },
      { name: "package-services", icon: Package, keywords: ["correios", "entrega", "envio", "remessa"] },
      { name: "shirt-services", icon: Shirt, keywords: ["costura", "alfaiate", "roupa", "ajuste"] },
      { name: "camera-services", icon: Camera, keywords: ["fotografia", "foto", "estúdio", "ensaio"] },
      { name: "brush-services", icon: Brush, keywords: ["manicure", "pedicure", "unhas", "nail"] },
      { name: "baby-services", icon: Baby, keywords: ["babá", "cuidador", "criança", "infantil"] },
      { name: "heart-services", icon: Heart, keywords: ["cuidador", "idoso", "enfermagem", "home care"] },
      { name: "graduation-services", icon: GraduationCap, keywords: ["professor", "aula", "particular", "reforço"] },
      { name: "dumbbell-services", icon: Dumbbell, keywords: ["personal", "treino", "fitness", "academia"] },
      { name: "utensils-services", icon: Utensils, keywords: ["chef", "buffet", "catering", "cozinheiro"] },
      { name: "scale-services", icon: Scale, keywords: ["advogado", "jurídico", "legal", "advocacia"] },
      { name: "shield-services", icon: Shield, keywords: ["segurança", "vigilância", "porteiro", "monitoramento"] },
      { name: "hammer-services", icon: Hammer, keywords: ["pedreiro", "obra", "construção", "reforma"] },
      { name: "printer-services", icon: Printer, keywords: ["gráfica", "impressão", "cópia", "xerox"] },
      { name: "paintbrush-services", icon: Paintbrush2, keywords: ["pintor", "pintura", "parede", "decoração"] },
      { name: "laptop-services", icon: Laptop, keywords: ["informática", "computador", "técnico", "TI"] },
      { name: "bed-services", icon: Bed, keywords: ["hotel", "pousada", "hospedagem", "airbnb"] },
      { name: "plane-services", icon: Plane, keywords: ["agência", "viagem", "turismo", "passagem"] },
      { name: "mail-services", icon: Mail, keywords: ["correio", "motoboy", "entregador", "delivery"] },
      { name: "message-services", icon: MessageSquare, keywords: ["suporte", "atendimento", "chat", "sac"] },
      { name: "file-services", icon: FileText, keywords: ["contador", "contabilidade", "documentos", "fiscal"] },
      { name: "calculator-services", icon: Calculator, keywords: ["financeiro", "impostos", "declaração", "irpf"] },
      { name: "briefcase-services", icon: Briefcase, keywords: ["negócios", "empresarial", "corporativo"] },
      { name: "key-services", icon: Key, keywords: ["chaveiro", "cópia", "fechadura", "segurança"] },
      { name: "lock-services", icon: Lock, keywords: ["cofre", "seguro", "proteção"] },
      { name: "stethoscope-services", icon: Stethoscope, keywords: ["médico", "consulta", "clínica", "saúde"] },
      { name: "eye-services", icon: Eye, keywords: ["ótica", "óculos", "lente", "oftalmologista"] },
      { name: "syringe-services", icon: Syringe, keywords: ["laboratório", "exame", "coleta", "vacina"] },
      { name: "recycle", icon: Recycle, keywords: ["reciclagem", "lixo", "coleta", "sustentável"] },
      { name: "leaf-services", icon: Leaf, keywords: ["jardinagem", "paisagismo", "jardim", "plantas"] },
      { name: "trees-services", icon: Trees, keywords: ["poda", "árvore", "jardineiro", "paisagismo"] },
      { name: "flower-services", icon: Flower2, keywords: ["floricultura", "flores", "buquê", "arranjo"] },
      { name: "gift-services", icon: Gift, keywords: ["presentes", "embalagem", "decoração", "festa"] },
      { name: "archive-services", icon: Archive, keywords: ["arquivo", "documentos", "guarda", "storage"] },
      { name: "hard-drive-services", icon: HardDrive, keywords: ["backup", "dados", "recuperação", "TI"] },
      { name: "fingerprint-services", icon: Fingerprint, keywords: ["biometria", "identificação", "digital"] },
      { name: "scan-face-services", icon: ScanFace, keywords: ["reconhecimento", "facial", "segurança"] },
      { name: "qr-code-services", icon: QrCode, keywords: ["pagamento", "pix", "código", "leitura"] },
      { name: "map-pin-services", icon: MapPin, keywords: ["localização", "endereço", "GPS", "rastreamento"] },
      { name: "navigation-services", icon: Navigation, keywords: ["GPS", "rastreamento", "monitoramento"] },
      { name: "headphones-services", icon: Headphones, keywords: ["áudio", "podcast", "estúdio", "som"] },
      { name: "speaker-services", icon: Speaker, keywords: ["som", "DJ", "evento", "festa"] },
      { name: "projector-services", icon: Projector, keywords: ["audiovisual", "evento", "projeção"] },
      { name: "tv-services", icon: Tv, keywords: ["instalação", "antena", "cabo", "streaming"] },
      { name: "radio-services", icon: Radio, keywords: ["comunicação", "rádio", "transmissão"] },
      { name: "antenna-services", icon: Antenna, keywords: ["telecomunicações", "sinal", "instalação"] },
      { name: "satellite-services", icon: Satellite, keywords: ["satélite", "antena", "TV", "internet"] },
      { name: "signal-services", icon: Signal, keywords: ["rede", "sinal", "cobertura", "celular"] },
      { name: "cable-services", icon: Cable, keywords: ["cabeamento", "rede", "instalação", "estruturado"] },
      { name: "credit-card-services", icon: CreditCard, keywords: ["pagamento", "maquininha", "cartão"] },
      { name: "wallet-services", icon: Wallet, keywords: ["financeiro", "banco", "conta", "pagamento"] },
      { name: "piggy-bank-services", icon: PiggyBank, keywords: ["investimento", "poupança", "planejamento"] },
      { name: "trending-up-services", icon: TrendingUp, keywords: ["investimento", "ações", "corretora"] },
      { name: "landmark-services", icon: Landmark, keywords: ["banco", "financiamento", "empréstimo"] },
      { name: "receipt-services", icon: Receipt, keywords: ["nota fiscal", "recibo", "faturamento"] },
      { name: "coins-services", icon: Coins, keywords: ["câmbio", "moeda", "dólar", "euro"] },
      { name: "bitcoin-services", icon: Bitcoin, keywords: ["cripto", "bitcoin", "blockchain", "exchange"] },
      { name: "banknote-services", icon: Banknote, keywords: ["transferência", "remessa", "dinheiro"] },
      { name: "handshake-services", icon: Handshake, keywords: ["parceria", "negócio", "contrato", "acordo"] },
      { name: "user-plus-services", icon: UserPlus, keywords: ["recrutamento", "vaga", "emprego", "RH"] },
      { name: "id-card-services", icon: IdCard, keywords: ["documentos", "RG", "CNH", "identidade"] },
      { name: "badge-check-services", icon: BadgeCheck, keywords: ["certificação", "diploma", "curso"] },
      { name: "award-services", icon: Award, keywords: ["prêmio", "reconhecimento", "concurso"] },
      { name: "trophy-services", icon: Trophy, keywords: ["competição", "campeonato", "evento"] },
      { name: "star-services", icon: Star, keywords: ["avaliação", "nota", "review", "feedback"] },
      { name: "thumbs-up-services", icon: ThumbsUp, keywords: ["aprovação", "like", "recomendação"] },
      { name: "bar-chart-services", icon: BarChart3, keywords: ["análise", "dados", "relatório", "BI"] },
      { name: "pie-chart-services", icon: PieChart, keywords: ["estatística", "gráfico", "dashboard"] },
      { name: "target-services", icon: Target, keywords: ["marketing", "anúncio", "campanha", "ads"] },
      { name: "megaphone-services", icon: Megaphone, keywords: ["publicidade", "propaganda", "divulgação"] },
      { name: "rss-services", icon: Rss, keywords: ["conteúdo", "blog", "mídia", "social"] },
      { name: "share-services", icon: Share2, keywords: ["influencer", "marketing", "redes sociais"] },
      { name: "search-services", icon: Search, keywords: ["pesquisa", "SEO", "busca", "investigação"] },
      { name: "bot-services", icon: Bot, keywords: ["automação", "chatbot", "IA", "inteligência artificial"] },
      { name: "wand-services", icon: Wand2, keywords: ["automação", "mágica", "produtividade"] },
      { name: "workflow-services", icon: Workflow, keywords: ["processo", "fluxo", "automação", "integração"] },
      { name: "cog-services", icon: Cog, keywords: ["configuração", "sistema", "integração", "API"] },
      { name: "code-services", icon: Code, keywords: ["desenvolvimento", "programação", "software", "app"] },
      { name: "terminal-services", icon: Terminal, keywords: ["servidor", "hospedagem", "cloud", "devops"] },
      { name: "database-services", icon: Database, keywords: ["dados", "armazenamento", "cloud", "backup"] },
      { name: "cloud-services", icon: Cloud, keywords: ["nuvem", "SaaS", "hosting", "armazenamento"] },
      { name: "server-services", icon: Server, keywords: ["servidor", "hospedagem", "infraestrutura"] },
      { name: "shield-check-services", icon: ShieldCheck, keywords: ["segurança", "cyber", "proteção", "antivírus"] },
      { name: "file-search-services", icon: FileSearch, keywords: ["pesquisa", "análise", "investigação"] },
      { name: "book-open-services", icon: BookOpen, keywords: ["editora", "publicação", "livro", "ebook"] },
      { name: "languages-services", icon: Languages, keywords: ["tradução", "idioma", "intérprete", "legendas"] },
      { name: "presentation-services", icon: Presentation, keywords: ["treinamento", "palestra", "workshop", "curso"] },
      { name: "video-services", icon: Video, keywords: ["videoconferência", "streaming", "live", "webinar"] },
    ],
  },
  {
    name: "Assinaturas",
    icons: [
      { name: "tv-streaming", icon: Tv, keywords: ["netflix", "amazon", "disney", "hbo", "streaming", "tv"] },
      { name: "film-streaming", icon: Film, keywords: ["filmes", "cinema", "streaming", "vídeo"] },
      { name: "music-streaming", icon: Music, keywords: ["spotify", "deezer", "apple music", "música"] },
      { name: "gamepad-subscription", icon: Gamepad2, keywords: ["xbox", "playstation", "nintendo", "games"] },
      { name: "book-subscription", icon: BookOpen, keywords: ["kindle", "ebook", "leitura", "audible"] },
      { name: "newspaper", icon: Newspaper, keywords: ["jornal", "notícias", "revista", "assinatura"] },
      { name: "podcast-subscription", icon: Podcast, keywords: ["podcast", "áudio", "programa"] },
      { name: "cloud-storage", icon: Cloud, keywords: ["icloud", "google drive", "dropbox", "onedrive"] },
      { name: "vpn-service", icon: Shield, keywords: ["vpn", "segurança", "privacidade", "nordvpn"] },
      { name: "password-manager", icon: Lock, keywords: ["1password", "lastpass", "senha", "segurança"] },
      { name: "document-service", icon: FileText, keywords: ["office", "word", "docs", "documentos"] },
      { name: "spreadsheet-service", icon: FileSpreadsheet, keywords: ["excel", "planilha", "sheets"] },
      { name: "email-service", icon: Mail, keywords: ["email", "gmail", "outlook", "protonmail"] },
      { name: "calendar-service", icon: Calendar, keywords: ["calendário", "agenda", "google calendar"] },
      { name: "team-service", icon: Users, keywords: ["slack", "teams", "discord", "equipe"] },
      { name: "meeting-service", icon: Video, keywords: ["zoom", "meet", "reunião", "videoconferência"] },
      { name: "chat-service", icon: MessageSquare, keywords: ["whatsapp", "telegram", "chat", "mensagem"] },
      { name: "voip-service", icon: Phone, keywords: ["voip", "telefone", "ligação", "skype"] },
      { name: "domain-service", icon: Globe, keywords: ["domínio", "site", "registro", "godaddy"] },
      { name: "web-hosting", icon: Server, keywords: ["hospedagem", "site", "servidor", "vercel"] },
      { name: "database-service", icon: Database, keywords: ["banco de dados", "supabase", "firebase"] },
      { name: "ssl-service", icon: ShieldCheck, keywords: ["ssl", "https", "certificado", "segurança"] },
      { name: "mobile-subscription", icon: Smartphone, keywords: ["celular", "plano", "dados", "operadora"] },
      { name: "internet-subscription", icon: Wifi, keywords: ["internet", "fibra", "banda larga", "provedor"] },
      { name: "satellite-subscription", icon: Satellite, keywords: ["satélite", "starlink", "internet rural"] },
    ],
  },
  {
    name: "Transporte",
    icons: [
      { name: "car", icon: Car, keywords: ["carro", "veículo", "automóvel"] },
      { name: "car-front", icon: CarFront, keywords: ["carro", "veículo", "frente"] },
      { name: "bus", icon: Bus, keywords: ["ônibus", "transporte público"] },
      { name: "train", icon: Train, keywords: ["trem", "metrô"] },
      { name: "train-front", icon: TrainFront, keywords: ["trem", "metrô", "frente"] },
      { name: "train-track", icon: TrainTrack, keywords: ["trilhos", "ferrovia"] },
      { name: "bike", icon: Bike, keywords: ["bicicleta", "ciclismo"] },
      { name: "fuel", icon: Fuel, keywords: ["gasolina", "combustível", "posto"] },
      { name: "plane", icon: Plane, keywords: ["avião", "viagem", "aéreo"] },
      { name: "plane-takeoff", icon: PlaneTakeoff, keywords: ["decolagem", "avião", "partida"] },
      { name: "plane-landing", icon: PlaneLanding, keywords: ["aterrissagem", "avião", "chegada"] },
      { name: "ship", icon: Ship, keywords: ["barco", "navio", "balsa"] },
      { name: "truck", icon: Truck, keywords: ["caminhão", "frete", "entrega"] },
      { name: "car-taxi-front", icon: CarTaxiFront, keywords: ["táxi", "uber", "corrida"] },
      { name: "sailboat", icon: Sailboat, keywords: ["veleiro", "barco", "mar"] },
      { name: "sailboat", icon: Sailboat, keywords: ["veleiro", "barco", "mar"] },
      { name: "rocket", icon: Rocket, keywords: ["foguete", "espaço", "rápido"] },
      { name: "tractor", icon: Tractor, keywords: ["trator", "fazenda", "rural"] },
      { name: "circle-parking", icon: CircleParking, keywords: ["estacionamento", "parking"] },
      { name: "ambulance", icon: Ambulance, keywords: ["ambulância", "emergência", "hospital"] },
      { name: "forklift", icon: Forklift, keywords: ["empilhadeira", "carga", "armazém"] },
      { name: "container", icon: Container, keywords: ["contêiner", "carga", "transporte"] },
      { name: "gauge", icon: Gauge, keywords: ["velocímetro", "velocidade", "painel"] },
      { name: "navigation-2", icon: Navigation2, keywords: ["navegação", "GPS", "direção"] },
    ],
  },
  {
    name: "Moradia",
    icons: [
      { name: "home", icon: Home, keywords: ["casa", "moradia", "lar"] },
      { name: "house", icon: House, keywords: ["casa", "residência"] },
      { name: "building", icon: Building, keywords: ["prédio", "apartamento"] },
      { name: "lightbulb", icon: Lightbulb, keywords: ["luz", "energia", "eletricidade"] },
      { name: "droplets", icon: Droplets, keywords: ["água", "conta"] },
      { name: "wifi", icon: Wifi, keywords: ["internet", "conexão"] },
      { name: "wrench", icon: Wrench, keywords: ["manutenção", "conserto", "reparo"] },
      { name: "sofa", icon: Sofa, keywords: ["móveis", "decoração", "sala"] },
      { name: "key", icon: Key, keywords: ["aluguel", "condomínio", "chave"] },
      { name: "bed", icon: Bed, keywords: ["cama", "quarto", "dormir"] },
      { name: "bath", icon: Bath, keywords: ["banheiro", "banho", "banheira"] },
      { name: "lamp", icon: Lamp, keywords: ["abajur", "iluminação", "luz"] },
      { name: "lamp-desk", icon: LampDesk, keywords: ["luminária", "escritório", "mesa"] },
      { name: "lamp-floor", icon: LampFloor, keywords: ["luminária", "chão", "sala"] },
      { name: "lamp-ceiling", icon: LampCeiling, keywords: ["lustre", "teto", "iluminação"] },
      { name: "door-open", icon: DoorOpen, keywords: ["porta", "entrada", "aberta"] },
      { name: "door-closed", icon: DoorClosed, keywords: ["porta", "fechada"] },
      { name: "fence", icon: Fence, keywords: ["cerca", "jardim", "quintal"] },
      { name: "refrigerator", icon: Refrigerator, keywords: ["geladeira", "cozinha"] },
      { name: "washing-machine", icon: WashingMachine, keywords: ["máquina de lavar", "lavanderia"] },
      { name: "air-vent", icon: AirVent, keywords: ["ar condicionado", "ventilação"] },
      { name: "heater", icon: Heater, keywords: ["aquecedor", "calefação"] },
      { name: "plug", icon: Plug, keywords: ["tomada", "energia", "elétrica"] },
      { name: "fan", icon: Fan, keywords: ["ventilador", "ar", "resfriamento"] },
      { name: "lock", icon: Lock, keywords: ["tranca", "segurança", "fechadura"] },
      { name: "warehouse", icon: Warehouse, keywords: ["depósito", "armazém", "garagem"] },
      { name: "tree-deciduous", icon: TreeDeciduous, keywords: ["árvore", "jardim", "natureza"] },
      { name: "blinds", icon: Blinds, keywords: ["persiana", "janela", "cortina"] },
      { name: "armchair", icon: Armchair, keywords: ["poltrona", "sala", "móvel"] },
      { name: "frame", icon: Frame, keywords: ["quadro", "moldura", "decoração"] },
      { name: "image", icon: Image, keywords: ["foto", "quadro", "decoração"] },
    ],
  },
  {
    name: "Saúde",
    icons: [
      { name: "heart", icon: Heart, keywords: ["saúde", "amor", "vida", "coração"] },
      { name: "heart-pulse", icon: HeartPulse, keywords: ["batimento", "cardíaco", "pulso"] },
      { name: "heart-crack", icon: HeartCrack, keywords: ["coração partido", "dor"] },
      { name: "pill", icon: Pill, keywords: ["remédio", "medicamento", "farmácia"] },
      { name: "stethoscope", icon: Stethoscope, keywords: ["médico", "consulta"] },
      { name: "activity", icon: Activity, keywords: ["exame", "saúde", "monitoramento"] },
      { name: "hospital", icon: Hospital, keywords: ["hospital", "clínica"] },
      { name: "syringe", icon: Syringe, keywords: ["injeção", "vacina", "seringa"] },
      { name: "thermometer", icon: Thermometer, keywords: ["febre", "temperatura"] },
      { name: "brain", icon: Brain, keywords: ["cérebro", "mente", "neurologia"] },
      { name: "brain-circuit", icon: BrainCircuit, keywords: ["neurociência", "tecnologia", "IA"] },
      { name: "brain-cog", icon: BrainCog, keywords: ["psicologia", "terapia", "mente"] },
      { name: "eye", icon: Eye, keywords: ["olho", "visão", "oftalmologia"] },
      { name: "ear", icon: Ear, keywords: ["ouvido", "audição", "otorrino"] },
      { name: "hand", icon: Hand, keywords: ["mão", "ortopedia"] },
      { name: "bone", icon: Bone, keywords: ["osso", "ortopedia", "esqueleto"] },
      { name: "accessibility", icon: Accessibility, keywords: ["acessibilidade", "cadeira de rodas"] },
      { name: "cross", icon: Cross, keywords: ["cruz", "hospital", "emergência"] },
      { name: "shield-plus", icon: ShieldPlus, keywords: ["plano de saúde", "seguro"] },
      { name: "bandage", icon: Bandage, keywords: ["curativo", "ferimento", "band-aid"] },
      { name: "microscope", icon: Microscope, keywords: ["laboratório", "exame", "análise"] },
      { name: "test-tube", icon: TestTube, keywords: ["teste", "laboratório", "exame"] },
      { name: "dna", icon: Dna, keywords: ["genética", "exame", "dna"] },
      { name: "scan", icon: Scan, keywords: ["raio-x", "tomografia", "exame"] },
    ],
  },
  {
    name: "Lazer",
    icons: [
      { name: "gamepad-2", icon: Gamepad2, keywords: ["jogos", "games", "videogame"] },
      { name: "gamepad", icon: Gamepad, keywords: ["controle", "jogo", "console"] },
      { name: "joystick", icon: Joystick, keywords: ["arcade", "jogo", "fliperama"] },
      { name: "film", icon: Film, keywords: ["cinema", "filme", "streaming"] },
      { name: "music", icon: Music, keywords: ["música", "show", "spotify"] },
      { name: "book", icon: Book, keywords: ["livro", "leitura", "educação"] },
      { name: "book-open", icon: BookOpen, keywords: ["livro aberto", "leitura"] },
      { name: "camera", icon: Camera, keywords: ["foto", "fotografia"] },
      { name: "tv", icon: Tv, keywords: ["televisão", "streaming", "netflix"] },
      { name: "headphones", icon: Headphones, keywords: ["música", "podcast", "áudio"] },
      { name: "dice-1", icon: Dice1, keywords: ["dado", "jogo", "sorte"] },
      { name: "dice-5", icon: Dice5, keywords: ["dado", "jogo", "azar"] },
      { name: "puzzle", icon: Puzzle, keywords: ["quebra-cabeça", "jogo", "puzzle"] },
      { name: "palette", icon: Palette, keywords: ["arte", "pintura", "cores"] },
      { name: "paintbrush", icon: Paintbrush, keywords: ["pincel", "arte", "pintura"] },
      { name: "theater", icon: Theater, keywords: ["teatro", "peça", "show"] },
      { name: "clapperboard", icon: Clapperboard, keywords: ["cinema", "filme", "gravação"] },
      { name: "radio", icon: Radio, keywords: ["rádio", "música", "notícias"] },
      { name: "podcast", icon: Podcast, keywords: ["podcast", "áudio", "show"] },
      { name: "library", icon: Library, keywords: ["biblioteca", "livros", "estudo"] },
      { name: "party-popper", icon: PartyPopper, keywords: ["festa", "celebração", "evento"] },
      { name: "wand-2", icon: Wand2, keywords: ["mágica", "fantasia", "diversão"] },
      { name: "drama", icon: Drama, keywords: ["teatro", "máscaras", "arte"] },
      { name: "telescope", icon: Telescope, keywords: ["telescópio", "astronomia", "estrelas"] },
      { name: "binoculars", icon: Binoculars, keywords: ["binóculos", "observação", "natureza"] },
      { name: "tent", icon: Tent, keywords: ["camping", "acampamento", "natureza"] },
      { name: "mountain", icon: Mountain, keywords: ["montanha", "trilha", "aventura"] },
      { name: "compass", icon: Compass, keywords: ["bússola", "direção", "aventura"] },
      { name: "map", icon: Map, keywords: ["mapa", "viagem", "navegação"] },
      { name: "piano", icon: Piano, keywords: ["piano", "música", "instrumento"] },
      { name: "guitar", icon: Guitar, keywords: ["violão", "guitarra", "música"] },
      { name: "drum", icon: Drum, keywords: ["bateria", "percussão", "música"] },
      { name: "mic", icon: Mic, keywords: ["karaoke", "cantar", "microfone"] },
    ],
  },
  {
    name: "Trabalho",
    icons: [
      { name: "briefcase", icon: Briefcase, keywords: ["trabalho", "emprego", "salário"] },
      { name: "laptop", icon: Laptop, keywords: ["computador", "trabalho", "notebook"] },
      { name: "building-2", icon: Building2, keywords: ["empresa", "escritório"] },
      { name: "graduation-cap", icon: GraduationCap, keywords: ["educação", "curso", "faculdade"] },
      { name: "pen-tool", icon: PenTool, keywords: ["design", "criativo"] },
      { name: "file-text", icon: FileText, keywords: ["documento", "contrato"] },
      { name: "presentation", icon: Presentation, keywords: ["apresentação", "reunião", "slides"] },
      { name: "projector", icon: Projector, keywords: ["projetor", "apresentação", "reunião"] },
      { name: "calendar", icon: Calendar, keywords: ["calendário", "agenda", "data"] },
      { name: "calendar-days", icon: CalendarDays, keywords: ["calendário", "mês", "planejamento"] },
      { name: "clock", icon: Clock, keywords: ["relógio", "horário", "tempo"] },
      { name: "timer", icon: Timer, keywords: ["cronômetro", "tempo", "prazo"] },
      { name: "notebook", icon: Notebook, keywords: ["caderno", "anotações"] },
      { name: "notebook-pen", icon: NotebookPen, keywords: ["caderno", "escrever", "notas"] },
      { name: "clipboard-list", icon: ClipboardList, keywords: ["lista", "tarefas", "checklist"] },
      { name: "clipboard-check", icon: ClipboardCheck, keywords: ["concluído", "verificado", "aprovado"] },
      { name: "stamp", icon: Stamp, keywords: ["carimbo", "aprovação", "oficial"] },
      { name: "paperclip", icon: Paperclip, keywords: ["clipe", "anexo", "documento"] },
      { name: "book-marked", icon: BookMarked, keywords: ["marcador", "livro", "favorito"] },
      { name: "award", icon: Award, keywords: ["prêmio", "conquista", "reconhecimento"] },
      { name: "badge", icon: Badge, keywords: ["distintivo", "conquista"] },
      { name: "badge-check", icon: BadgeCheck, keywords: ["verificado", "certificado"] },
      { name: "users", icon: Users, keywords: ["equipe", "grupo", "pessoas"] },
      { name: "user-plus", icon: UserPlus, keywords: ["adicionar usuário", "novo membro"] },
      { name: "user-check", icon: UserCheck, keywords: ["usuário verificado", "aprovado"] },
      { name: "user-cog", icon: UserCog, keywords: ["configuração", "usuário", "admin"] },
      { name: "contact", icon: Contact, keywords: ["contato", "cartão de visita"] },
      { name: "id-card", icon: IdCard, keywords: ["identidade", "crachá", "RG"] },
      { name: "layout-dashboard", icon: LayoutDashboard, keywords: ["dashboard", "painel", "controle"] },
      { name: "layers", icon: Layers, keywords: ["camadas", "design", "estrutura"] },
      { name: "network", icon: Network, keywords: ["rede", "conexão", "networking"] },
    ],
  },
  {
    name: "Finanças",
    icons: [
      { name: "wallet", icon: Wallet, keywords: ["carteira", "dinheiro"] },
      { name: "credit-card", icon: CreditCard, keywords: ["cartão", "crédito", "débito"] },
      { name: "banknote", icon: Banknote, keywords: ["dinheiro", "nota", "cash"] },
      { name: "piggy-bank", icon: PiggyBank, keywords: ["poupança", "economia", "investimento"] },
      { name: "trending-up", icon: TrendingUp, keywords: ["investimento", "ações", "lucro", "alta"] },
      { name: "trending-down", icon: TrendingDown, keywords: ["queda", "perda", "baixa"] },
      { name: "receipt", icon: Receipt, keywords: ["recibo", "nota fiscal"] },
      { name: "receipt-text", icon: ReceiptText, keywords: ["fatura", "conta", "cobrança"] },
      { name: "coins", icon: Coins, keywords: ["moedas", "dinheiro", "troco"] },
      { name: "hand-coins", icon: HandCoins, keywords: ["pagamento", "gorjeta", "doação"] },
      { name: "dollar-sign", icon: DollarSign, keywords: ["dólar", "dinheiro", "preço"] },
      { name: "euro", icon: Euro, keywords: ["euro", "europa", "moeda"] },
      { name: "bitcoin", icon: Bitcoin, keywords: ["bitcoin", "cripto", "criptomoeda"] },
      { name: "circle-dollar-sign", icon: CircleDollarSign, keywords: ["dinheiro", "pagamento", "preço"] },
      { name: "badge-dollar-sign", icon: BadgeDollarSign, keywords: ["preço", "valor", "custo"] },
      { name: "landmark", icon: Landmark, keywords: ["banco", "instituição financeira"] },
      { name: "bar-chart-3", icon: BarChart3, keywords: ["gráfico", "relatório", "estatísticas"] },
      { name: "bar-chart-4", icon: BarChart4, keywords: ["gráfico de barras", "análise"] },
      { name: "line-chart", icon: LineChart, keywords: ["gráfico de linha", "tendência"] },
      { name: "pie-chart", icon: PieChart, keywords: ["gráfico de pizza", "percentual"] },
      { name: "calculator", icon: Calculator, keywords: ["calculadora", "contas", "cálculo"] },
      { name: "percent", icon: Percent, keywords: ["porcentagem", "desconto", "taxa"] },
      { name: "circle-percent", icon: CirclePercent, keywords: ["porcentagem", "taxa", "juros"] },
      { name: "badge-percent", icon: BadgePercent, keywords: ["desconto", "promoção", "cupom"] },
      { name: "scale", icon: Scale, keywords: ["balança", "justiça", "equilíbrio"] },
      { name: "arrow-up-down", icon: ArrowUpDown, keywords: ["transferência", "movimento"] },
      { name: "repeat", icon: Repeat, keywords: ["recorrência", "repetição", "mensal"] },
      { name: "gem", icon: Gem, keywords: ["joia", "valor", "precioso", "investimento"] },
      { name: "file-spreadsheet", icon: FileSpreadsheet, keywords: ["planilha", "excel", "dados"] },
    ],
  },
  {
    name: "Esporte",
    icons: [
      { name: "dumbbell", icon: Dumbbell, keywords: ["academia", "exercício", "fitness", "musculação"] },
      { name: "trophy", icon: Trophy, keywords: ["prêmio", "competição", "vitória"] },
      { name: "target", icon: Target, keywords: ["objetivo", "meta", "alvo"] },
      { name: "medal", icon: Medal, keywords: ["medalha", "conquista", "prêmio"] },
      { name: "volleyball", icon: Volleyball, keywords: ["vôlei", "bola", "esporte"] },
      { name: "dribbble", icon: Dribbble, keywords: ["basquete", "bola", "esporte"] },
      { name: "goal", icon: Goal, keywords: ["gol", "futebol", "meta"] },
      { name: "flame", icon: Flame, keywords: ["fogo", "energia", "queima", "calorias"] },
      { name: "footprints", icon: Footprints, keywords: ["passos", "caminhada", "corrida"] },
      { name: "person-standing", icon: PersonStanding, keywords: ["pessoa", "exercício", "alongamento"] },
      { name: "waves", icon: Waves, keywords: ["natação", "piscina", "água"] },
      { name: "snowflake", icon: Snowflake, keywords: ["inverno", "esqui", "gelo"] },
      { name: "wind", icon: Wind, keywords: ["vento", "corrida", "velocidade"] },
      { name: "zap", icon: Zap, keywords: ["energia", "poder", "força"] },
      { name: "crown", icon: Crown, keywords: ["coroa", "campeão", "rei"] },
      { name: "swords", icon: Swords, keywords: ["esgrima", "luta", "combate"] },
      { name: "waypoints", icon: Waypoints, keywords: ["corrida", "trilha", "percurso"] },
      { name: "scaling", icon: Scaling, keywords: ["escalada", "subida", "montanha"] },
    ],
  },
  {
    name: "Pessoal",
    icons: [
      { name: "baby", icon: Baby, keywords: ["bebê", "criança", "filho"] },
      { name: "dog", icon: Dog, keywords: ["cachorro", "pet", "animal"] },
      { name: "cat", icon: Cat, keywords: ["gato", "pet", "animal"] },
      { name: "scissors", icon: Scissors, keywords: ["cabelo", "beleza", "salão"] },
      { name: "shirt", icon: Shirt, keywords: ["roupa", "vestuário", "moda"] },
      { name: "watch", icon: Watch, keywords: ["relógio", "acessório", "tempo"] },
      { name: "user", icon: User, keywords: ["usuário", "pessoa", "perfil"] },
      { name: "user-circle", icon: UserCircle, keywords: ["avatar", "perfil", "conta"] },
      { name: "user-round", icon: UserRound, keywords: ["pessoa", "usuário", "perfil"] },
      { name: "circle-user", icon: CircleUser, keywords: ["avatar", "conta", "perfil"] },
      { name: "users-2", icon: Users2, keywords: ["família", "grupo", "amigos"] },
      { name: "gem", icon: Gem, keywords: ["joia", "diamante", "precioso"] },
      { name: "glasses", icon: Glasses, keywords: ["óculos", "visão", "acessório"] },
      { name: "brush", icon: Brush, keywords: ["escova", "cabelo", "beleza"] },
      { name: "spray-can", icon: SprayCan, keywords: ["spray", "perfume", "cosmético"] },
      { name: "shower-head", icon: ShowerHead, keywords: ["chuveiro", "banho", "higiene"] },
      { name: "sparkle", icon: Sparkle, keywords: ["brilho", "especial", "novo"] },
      { name: "smile", icon: Smile, keywords: ["sorriso", "feliz", "alegria"] },
      { name: "smile-plus", icon: SmilePlus, keywords: ["muito feliz", "alegria", "positivo"] },
      { name: "frown", icon: Frown, keywords: ["triste", "chateado", "negativo"] },
      { name: "meh", icon: Meh, keywords: ["neutro", "indiferente", "ok"] },
    ],
  },
  {
    name: "Tecnologia",
    icons: [
      { name: "phone", icon: Phone, keywords: ["telefone", "celular", "ligação"] },
      { name: "smartphone", icon: Smartphone, keywords: ["celular", "mobile", "app"] },
      { name: "monitor", icon: Monitor, keywords: ["computador", "tela", "desktop"] },
      { name: "monitor-smartphone", icon: MonitorSmartphone, keywords: ["responsivo", "dispositivos", "tela"] },
      { name: "printer", icon: Printer, keywords: ["impressora", "escritório", "papel"] },
      { name: "cpu", icon: Cpu, keywords: ["processador", "computador", "hardware"] },
      { name: "hard-drive", icon: HardDrive, keywords: ["hd", "armazenamento", "disco"] },
      { name: "server", icon: Server, keywords: ["servidor", "hosting", "cloud"] },
      { name: "server-cog", icon: ServerCog, keywords: ["configuração", "servidor", "manutenção"] },
      { name: "database", icon: Database, keywords: ["banco de dados", "dados", "armazenamento"] },
      { name: "database-backup", icon: DatabaseBackup, keywords: ["backup", "dados", "segurança"] },
      { name: "usb", icon: Usb, keywords: ["pendrive", "conexão", "cabo"] },
      { name: "bluetooth", icon: Bluetooth, keywords: ["sem fio", "conexão", "wireless"] },
      { name: "signal", icon: Signal, keywords: ["sinal", "rede", "wifi"] },
      { name: "antenna", icon: Antenna, keywords: ["antena", "transmissão", "rádio"] },
      { name: "satellite-dish", icon: SatelliteDish, keywords: ["parabólica", "sinal", "TV"] },
      { name: "router", icon: Router, keywords: ["roteador", "wifi", "rede"] },
      { name: "circuit-board", icon: CircuitBoard, keywords: ["circuito", "eletrônica", "hardware"] },
      { name: "memory-stick", icon: MemoryStick, keywords: ["memória RAM", "hardware", "componente"] },
      { name: "keyboard", icon: Keyboard, keywords: ["teclado", "digitar", "computador"] },
      { name: "mouse", icon: Mouse, keywords: ["mouse", "cursor", "computador"] },
      { name: "tablet", icon: Tablet, keywords: ["tablet", "ipad", "touch"] },
      { name: "cable", icon: Cable, keywords: ["cabo", "conexão", "fio"] },
      { name: "battery", icon: Battery, keywords: ["bateria", "energia", "carga"] },
      { name: "battery-charging", icon: BatteryCharging, keywords: ["carregando", "energia"] },
      { name: "power", icon: Power, keywords: ["ligar", "desligar", "energia"] },
      { name: "settings", icon: Settings, keywords: ["configurações", "ajustes", "opções"] },
      { name: "globe", icon: Globe, keywords: ["internet", "web", "mundial"] },
      { name: "cloud", icon: Cloud, keywords: ["nuvem", "armazenamento", "online"] },
      { name: "cloud-download", icon: CloudDownload, keywords: ["download", "baixar", "nuvem"] },
      { name: "cloud-upload", icon: CloudUpload, keywords: ["upload", "enviar", "nuvem"] },
      { name: "download", icon: Download, keywords: ["baixar", "download"] },
      { name: "upload", icon: Upload, keywords: ["enviar", "upload"] },
      { name: "link", icon: Link, keywords: ["link", "url", "conexão"] },
      { name: "share-2", icon: Share2, keywords: ["compartilhar", "enviar"] },
      { name: "qr-code", icon: QrCode, keywords: ["qr code", "código", "scan"] },
      { name: "nfc", icon: Nfc, keywords: ["nfc", "contactless", "pagamento"] },
      { name: "wifi", icon: Wifi, keywords: ["wifi", "internet", "conexão"] },
      { name: "wifi-off", icon: WifiOff, keywords: ["sem wifi", "desconectado", "offline"] },
    ],
  },
  {
    name: "Natureza",
    icons: [
      { name: "trees", icon: Trees, keywords: ["natureza", "parque", "floresta"] },
      { name: "tree-pine", icon: TreePine, keywords: ["pinheiro", "natal", "floresta"] },
      { name: "flower-2", icon: Flower2, keywords: ["flor", "jardim", "plantas"] },
      { name: "flower", icon: Flower, keywords: ["flor", "rosa", "jardim"] },
      { name: "sun", icon: Sun, keywords: ["sol", "verão", "praia"] },
      { name: "umbrella", icon: Umbrella, keywords: ["chuva", "guarda-chuva"] },
      { name: "moon", icon: Moon, keywords: ["lua", "noite", "escuro"] },
      { name: "cloud-rain", icon: CloudRain, keywords: ["chuva", "tempo", "clima"] },
      { name: "cloud-sun", icon: CloudSun, keywords: ["parcialmente nublado", "tempo"] },
      { name: "cloud-snow", icon: CloudSnow, keywords: ["neve", "frio", "inverno"] },
      { name: "cloud-lightning", icon: CloudLightning, keywords: ["raio", "tempestade", "trovão"] },
      { name: "rainbow", icon: Rainbow, keywords: ["arco-íris", "cores", "chuva"] },
      { name: "leaf", icon: Leaf, keywords: ["folha", "natureza", "eco"] },
      { name: "sprout", icon: Sprout, keywords: ["broto", "crescimento", "planta"] },
      { name: "droplet", icon: Droplet, keywords: ["gota", "água", "chuva"] },
      { name: "bug", icon: Bug, keywords: ["inseto", "bug", "natureza"] },
      { name: "snail", icon: Snail, keywords: ["caracol", "lento", "jardim"] },
      { name: "bird", icon: Bird, keywords: ["pássaro", "ave", "natureza"] },
      { name: "squirrel", icon: Squirrel, keywords: ["esquilo", "animal", "floresta"] },
      { name: "rabbit", icon: Rabbit, keywords: ["coelho", "animal", "pet"] },
      { name: "turtle", icon: Turtle, keywords: ["tartaruga", "lento", "animal"] },
      { name: "palmtree", icon: Palmtree, keywords: ["palmeira", "praia", "tropical"] },
      { name: "clover", icon: Clover, keywords: ["trevo", "sorte", "natureza"] },
      { name: "shrub", icon: Shrub, keywords: ["arbusto", "jardim", "planta"] },
    ],
  },
  {
    name: "Casa e Jardim",
    icons: [
      { name: "hammer", icon: Hammer, keywords: ["martelo", "ferramenta", "construção"] },
      { name: "shovel", icon: Shovel, keywords: ["pá", "jardim", "escavar"] },
      { name: "axe", icon: Axe, keywords: ["machado", "cortar", "lenha"] },
      { name: "drill", icon: Drill, keywords: ["furadeira", "ferramenta", "construção"] },
      { name: "paint-bucket", icon: PaintBucket, keywords: ["tinta", "pintura", "reforma"] },
      { name: "ruler", icon: Ruler, keywords: ["régua", "medida", "construção"] },
      { name: "paintbrush-2", icon: Paintbrush2, keywords: ["pincel", "pintura", "arte"] },
      { name: "hard-hat", icon: HardHat, keywords: ["capacete", "obra", "segurança"] },
      { name: "pickaxe", icon: Pickaxe, keywords: ["picareta", "escavar", "mineração"] },
      { name: "construction", icon: Construction, keywords: ["construção", "obra", "reforma"] },
      { name: "brick-wall", icon: BrickWall, keywords: ["parede", "tijolos", "construção"] },
    ],
  },
  {
    name: "Comunicação",
    icons: [
      { name: "mail", icon: Mail, keywords: ["email", "carta", "mensagem"] },
      { name: "mail-open", icon: MailOpen, keywords: ["email aberto", "lido"] },
      { name: "mail-plus", icon: MailPlus, keywords: ["novo email", "adicionar", "criar"] },
      { name: "mail-check", icon: MailCheck, keywords: ["email enviado", "confirmado"] },
      { name: "mails", icon: Mails, keywords: ["emails", "caixa de entrada", "múltiplos"] },
      { name: "inbox", icon: Inbox, keywords: ["caixa de entrada", "recebidos", "emails"] },
      { name: "send", icon: Send, keywords: ["enviar", "mensagem"] },
      { name: "message-square", icon: MessageSquare, keywords: ["mensagem", "chat", "conversa"] },
      { name: "message-square-plus", icon: MessageSquarePlus, keywords: ["nova mensagem", "adicionar"] },
      { name: "message-circle", icon: MessageCircle, keywords: ["mensagem", "balão", "chat"] },
      { name: "phone-call", icon: PhoneCall, keywords: ["ligação", "chamada", "telefone"] },
      { name: "phone-outgoing", icon: PhoneOutgoing, keywords: ["ligação saindo", "discando"] },
      { name: "phone-incoming", icon: PhoneIncoming, keywords: ["ligação entrando", "recebendo"] },
      { name: "phone-missed", icon: PhoneMissed, keywords: ["ligação perdida", "não atendida"] },
      { name: "video", icon: Video, keywords: ["vídeo chamada", "reunião", "câmera"] },
      { name: "video-off", icon: VideoOff, keywords: ["vídeo desligado", "câmera off"] },
      { name: "voicemail", icon: Voicemail, keywords: ["caixa postal", "áudio"] },
      { name: "at-sign", icon: AtSign, keywords: ["arroba", "email", "menção"] },
      { name: "bell", icon: Bell, keywords: ["notificação", "sino", "alerta"] },
      { name: "bell-ring", icon: BellRing, keywords: ["notificação", "tocando", "alerta"] },
      { name: "bell-off", icon: BellOff, keywords: ["notificação off", "silencioso"] },
      { name: "megaphone", icon: Megaphone, keywords: ["megafone", "anúncio", "marketing"] },
      { name: "rss", icon: Rss, keywords: ["feed", "notícias", "blog"] },
      { name: "hash", icon: Hash, keywords: ["hashtag", "categoria", "tag"] },
    ],
  },
  {
    name: "Segurança",
    icons: [
      { name: "shield", icon: Shield, keywords: ["escudo", "proteção", "segurança"] },
      { name: "shield-check", icon: ShieldCheck, keywords: ["verificado", "seguro", "aprovado"] },
      { name: "shield-alert", icon: ShieldAlert, keywords: ["alerta", "perigo", "aviso"] },
      { name: "shield-off", icon: ShieldOff, keywords: ["desprotegido", "vulnerável"] },
      { name: "lock", icon: Lock, keywords: ["cadeado", "bloqueado", "seguro"] },
      { name: "lock-keyhole", icon: LockKeyhole, keywords: ["cadeado", "fechadura", "chave"] },
      { name: "lock-open", icon: LockOpen, keywords: ["desbloqueado", "aberto"] },
      { name: "unlock", icon: Unlock, keywords: ["desbloqueado", "aberto"] },
      { name: "key-round", icon: KeyRound, keywords: ["chave", "senha", "acesso"] },
      { name: "key-square", icon: KeySquare, keywords: ["chave quadrada", "acesso", "segurança"] },
      { name: "fingerprint", icon: Fingerprint, keywords: ["digital", "biometria", "segurança"] },
      { name: "scan-face", icon: ScanFace, keywords: ["reconhecimento facial", "biometria"] },
      { name: "scan-eye", icon: ScanEye, keywords: ["íris", "biometria", "olho"] },
      { name: "eye", icon: Eye, keywords: ["olho", "ver", "visível"] },
      { name: "eye-off", icon: EyeOff, keywords: ["esconder", "invisível", "privado"] },
      { name: "alert-triangle", icon: AlertTriangle, keywords: ["alerta", "aviso", "cuidado"] },
      { name: "alert-circle", icon: AlertCircle, keywords: ["informação", "aviso", "atenção"] },
      { name: "ban", icon: Ban, keywords: ["proibido", "bloqueado", "não permitido"] },
      { name: "x-circle", icon: XCircle, keywords: ["erro", "fechado", "cancelado"] },
      { name: "check-circle", icon: CheckCircle, keywords: ["sucesso", "correto", "aprovado"] },
    ],
  },
  {
    name: "Viagem",
    icons: [
      { name: "luggage", icon: Luggage, keywords: ["mala", "bagagem", "viagem"] },
      { name: "backpack", icon: Backpack, keywords: ["mochila", "viagem", "trilha"] },
      { name: "map", icon: Map, keywords: ["mapa", "navegação", "direções"] },
      { name: "map-pin", icon: MapPin, keywords: ["localização", "ponto", "lugar"] },
      { name: "map-pinned", icon: MapPinned, keywords: ["localização fixada", "marcado"] },
      { name: "map-pin-plus", icon: MapPinPlus, keywords: ["adicionar local", "novo ponto"] },
      { name: "navigation", icon: Navigation, keywords: ["navegação", "GPS", "direção"] },
      { name: "route", icon: Route, keywords: ["rota", "caminho", "trajeto"] },
      { name: "milestone", icon: Milestone, keywords: ["marco", "ponto", "progresso"] },
      { name: "hotel", icon: Hotel, keywords: ["hotel", "hospedagem", "acomodação"] },
      { name: "bed", icon: Bed, keywords: ["cama", "dormir", "hotel"] },
      { name: "ticket", icon: Ticket, keywords: ["ingresso", "passagem", "bilhete"] },
      { name: "globe", icon: Globe, keywords: ["mundo", "internacional", "global"] },
      { name: "flag", icon: Flag, keywords: ["bandeira", "país", "destino"] },
      { name: "signpost", icon: Signpost, keywords: ["placa", "direção", "sinalização"] },
      { name: "mountain-snow", icon: MountainSnow, keywords: ["montanha nevada", "ski", "inverno"] },
    ],
  },
  {
    name: "Compras",
    icons: [
      { name: "tag", icon: Tag, keywords: ["etiqueta", "categoria", "geral", "preço"] },
      { name: "tags", icon: Tags, keywords: ["etiquetas", "múltiplas", "preços"] },
      { name: "star", icon: Star, keywords: ["favorito", "importante", "avaliação"] },
      { name: "gift", icon: Gift, keywords: ["presente", "aniversário", "surpresa"] },
      { name: "shopping-bag", icon: ShoppingBag, keywords: ["compras", "sacola", "loja"] },
      { name: "shopping-basket", icon: ShoppingBasket, keywords: ["cesta", "compras", "mercado"] },
      { name: "package", icon: Package, keywords: ["pacote", "entrega", "correio"] },
      { name: "package-plus", icon: PackagePlus, keywords: ["novo pacote", "adicionar"] },
      { name: "package-open", icon: PackageOpen, keywords: ["pacote aberto", "unboxing"] },
      { name: "package-check", icon: PackageCheck, keywords: ["entregue", "recebido", "confirmado"] },
      { name: "sparkles", icon: Sparkles, keywords: ["especial", "premium", "novo"] },
      { name: "barcode", icon: Barcode, keywords: ["código de barras", "produto", "preço"] },
      { name: "box", icon: Box, keywords: ["caixa", "pacote", "produto"] },
      { name: "store", icon: Store, keywords: ["loja", "comércio", "shopping"] },
      { name: "boxes", icon: Boxes, keywords: ["estoque", "inventário", "caixas"] },
    ],
  },
  {
    name: "Educação",
    icons: [
      { name: "school", icon: School, keywords: ["escola", "estudo", "ensino"] },
      { name: "book-text", icon: BookText, keywords: ["livro", "texto", "leitura"] },
      { name: "book-copy", icon: BookCopy, keywords: ["livros", "cópias", "biblioteca"] },
      { name: "book-a", icon: BookA, keywords: ["alfabetização", "abc", "letras"] },
      { name: "book-audio", icon: BookAudio, keywords: ["audiobook", "áudio", "livro falado"] },
      { name: "book-check", icon: BookCheck, keywords: ["lido", "concluído", "verificado"] },
      { name: "book-heart", icon: BookHeart, keywords: ["favorito", "amado", "romance"] },
      { name: "bookmark", icon: Bookmark, keywords: ["marcador", "favorito", "salvo"] },
      { name: "library", icon: Library, keywords: ["biblioteca", "livros", "estudo"] },
      { name: "notebook-text", icon: NotebookText, keywords: ["anotações", "texto", "escrita"] },
      { name: "languages", icon: Languages, keywords: ["idiomas", "tradução", "línguas"] },
      { name: "file-question", icon: FileQuestion, keywords: ["dúvida", "pergunta", "questão"] },
      { name: "pen-line", icon: PenLine, keywords: ["escrever", "caneta", "anotação"] },
      { name: "highlighter", icon: Highlighter, keywords: ["marca texto", "destaque"] },
      { name: "eraser", icon: Eraser, keywords: ["borracha", "apagar", "corrigir"] },
      { name: "ruler", icon: Ruler, keywords: ["régua", "medida", "matemática"] },
      { name: "triangle", icon: Triangle, keywords: ["triângulo", "geometria", "forma"] },
      { name: "square", icon: Square, keywords: ["quadrado", "forma", "geometria"] },
    ],
  },
  {
    name: "Música e Áudio",
    icons: [
      { name: "music-2", icon: Music2, keywords: ["música", "nota", "melodia"] },
      { name: "music-3", icon: Music3, keywords: ["música", "notas", "som"] },
      { name: "music-4", icon: Music4, keywords: ["música", "playlist", "álbum"] },
      { name: "mic", icon: Mic, keywords: ["microfone", "gravar", "voz"] },
      { name: "mic-2", icon: Mic2, keywords: ["microfone", "karaoke", "cantar"] },
      { name: "mic-off", icon: MicOff, keywords: ["mudo", "silêncio", "desligado"] },
      { name: "volume-2", icon: Volume2, keywords: ["volume", "som", "alto"] },
      { name: "volume-x", icon: VolumeX, keywords: ["mudo", "sem som", "silêncio"] },
      { name: "play", icon: Play, keywords: ["play", "reproduzir", "iniciar"] },
      { name: "play-circle", icon: PlayCircle, keywords: ["play", "reproduzir", "botão"] },
      { name: "pause", icon: Pause, keywords: ["pausar", "parar", "esperar"] },
      { name: "pause-circle", icon: PauseCircle, keywords: ["pausar", "botão", "parar"] },
      { name: "skip-forward", icon: SkipForward, keywords: ["pular", "próxima", "avançar"] },
      { name: "skip-back", icon: SkipBack, keywords: ["voltar", "anterior", "retroceder"] },
      { name: "shuffle", icon: Shuffle, keywords: ["aleatório", "shuffle", "misturar"] },
      { name: "disc", icon: Disc, keywords: ["disco", "vinil", "cd"] },
      { name: "list-music", icon: ListMusic, keywords: ["playlist", "lista", "músicas"] },
      { name: "audio-waveform", icon: AudioWaveform, keywords: ["onda", "áudio", "som"] },
      { name: "audio-lines", icon: AudioLines, keywords: ["linhas de áudio", "som", "equalizer"] },
      { name: "headphones", icon: Headphones, keywords: ["fones", "música", "áudio"] },
      { name: "speaker", icon: Speaker, keywords: ["alto-falante", "som", "caixa de som"] },
    ],
  },
  {
    name: "Arquivos",
    icons: [
      { name: "file", icon: File, keywords: ["arquivo", "documento", "papel"] },
      { name: "file-plus", icon: FilePlus, keywords: ["novo arquivo", "adicionar"] },
      { name: "file-check", icon: FileCheck, keywords: ["arquivo verificado", "ok"] },
      { name: "file-search", icon: FileSearch, keywords: ["buscar arquivo", "pesquisar"] },
      { name: "file-image", icon: FileImage, keywords: ["imagem", "foto", "arquivo"] },
      { name: "file-video", icon: FileVideo, keywords: ["vídeo", "filme", "arquivo"] },
      { name: "file-audio", icon: FileAudio, keywords: ["áudio", "música", "arquivo"] },
      { name: "file-code", icon: FileCode, keywords: ["código", "programação", "arquivo"] },
      { name: "folder", icon: Folder, keywords: ["pasta", "diretório", "organização"] },
      { name: "folder-open", icon: FolderOpen, keywords: ["pasta aberta", "documentos"] },
      { name: "folder-plus", icon: FolderPlus, keywords: ["nova pasta", "adicionar"] },
      { name: "folder-check", icon: FolderCheck, keywords: ["pasta verificada", "ok"] },
      { name: "folder-search", icon: FolderSearch, keywords: ["buscar pasta", "pesquisar"] },
      { name: "folder-tree", icon: FolderTree, keywords: ["estrutura", "hierarquia", "diretórios"] },
      { name: "archive", icon: Archive, keywords: ["arquivo", "backup", "guardar"] },
      { name: "trash-2", icon: Trash2, keywords: ["lixo", "excluir", "deletar"] },
      { name: "save", icon: Save, keywords: ["salvar", "guardar", "disco"] },
      { name: "undo", icon: Undo, keywords: ["desfazer", "voltar", "anterior"] },
      { name: "redo", icon: Redo, keywords: ["refazer", "avançar", "próximo"] },
      { name: "copy", icon: Copy, keywords: ["copiar", "duplicar", "colar"] },
    ],
  },
  {
    name: "Serviços Específicos",
    icons: [
      // Lavagem e Auto
      { name: "car-front", icon: CarFront, keywords: ["lavagem de carro", "lava jato", "estética automotiva", "polimento"] },
      { name: "spray-can", icon: SprayCan, keywords: ["lavagem", "limpeza", "spray", "detalhamento"] },
      { name: "droplets", icon: Droplets, keywords: ["lavagem", "água", "lava rápido", "lava jato"] },
      { name: "sparkle", icon: Sparkle, keywords: ["polimento", "brilho", "estética", "enceramento"] },
      
      // Pet e Animais
      { name: "dog", icon: Dog, keywords: ["pet", "cachorro", "pet shop", "banho e tosa", "pet grooming", "veterinário"] },
      { name: "cat", icon: Cat, keywords: ["pet", "gato", "pet shop", "banho", "pet grooming"] },
      { name: "scissors", icon: Scissors, keywords: ["tosa", "grooming", "pet", "banho e tosa", "cabelo", "corte"] },
      { name: "bath", icon: Bath, keywords: ["banho", "pet", "banho e tosa", "higiene"] },
      
      // Delivery e Entregas
      { name: "bike", icon: Bike, keywords: ["delivery", "entrega", "ifood", "rappi", "uber eats", "99food", "motoboy"] },
      { name: "package", icon: Package, keywords: ["delivery", "entrega", "correios", "sedex", "encomenda", "mercado livre", "amazon"] },
      { name: "truck", icon: Truck, keywords: ["entrega", "frete", "delivery", "transportadora", "mudança"] },
      { name: "shopping-bag", icon: ShoppingBag, keywords: ["compras", "delivery", "ifood", "shopping", "rappi"] },
      { name: "utensils", icon: Utensils, keywords: ["ifood", "delivery", "comida", "restaurante", "uber eats", "rappi", "99food"] },
      
      // Streaming e Entretenimento Digital
      { name: "tv", icon: Tv, keywords: ["streaming", "netflix", "prime video", "disney plus", "hbo max", "globoplay", "youtube"] },
      { name: "film", icon: Film, keywords: ["streaming", "netflix", "cinema", "prime video", "filmes"] },
      { name: "play-circle", icon: PlayCircle, keywords: ["streaming", "spotify", "deezer", "youtube music", "amazon music", "play"] },
      { name: "headphones", icon: Headphones, keywords: ["spotify", "música", "podcast", "deezer", "youtube music", "audible"] },
      { name: "podcast", icon: Podcast, keywords: ["podcast", "spotify", "áudio", "youtube"] },
      { name: "gamepad-2", icon: Gamepad2, keywords: ["gaming", "xbox game pass", "playstation plus", "nintendo online", "steam"] },
      { name: "cloud", icon: Cloud, keywords: ["cloud", "icloud", "google drive", "dropbox", "onedrive", "nuvem"] },
      
      // Serviços Brasileiros - PIX
      { name: "zap", icon: Zap, keywords: ["pix", "transferência", "pagamento instantâneo", "banco central", "ted", "doc"] },
      { name: "qr-code", icon: QrCode, keywords: ["pix", "qr code", "pagamento", "leitura", "picpay"] },
      { name: "smartphone", icon: Smartphone, keywords: ["pix", "app banco", "nubank", "inter", "c6", "picpay", "mercado pago", "iti"] },
      
      // Apps de Transporte Brasileiros
      { name: "car-taxi-front", icon: CarTaxiFront, keywords: ["uber", "99", "táxi", "corrida", "cabify", "indriver", "99pop"] },
      { name: "navigation-2", icon: Navigation2, keywords: ["uber", "99", "waze", "google maps", "navegação", "corrida"] },
      { name: "map-pin", icon: MapPin, keywords: ["uber", "99", "localização", "ponto", "destino", "origem"] },
      
      // Bancos Digitais Brasileiros
      { name: "landmark", icon: Landmark, keywords: ["nubank", "inter", "c6 bank", "banco", "itaú", "bradesco", "santander", "bb", "caixa"] },
      { name: "credit-card", icon: CreditCard, keywords: ["nubank", "inter", "c6", "cartão", "crédito", "débito", "elo", "visa", "mastercard"] },
      { name: "wallet", icon: Wallet, keywords: ["nubank", "picpay", "mercado pago", "carteira digital", "ame", "iti", "pagseguro"] },
      { name: "circle-dollar-sign", icon: CircleDollarSign, keywords: ["nubank", "inter", "investimento", "rendimento", "poupança"] },
      { name: "piggy-bank", icon: PiggyBank, keywords: ["nubank", "inter", "poupança", "cofrinhos", "guardar dinheiro"] },
      
      // Assinaturas e Serviços
      { name: "repeat", icon: Repeat, keywords: ["assinatura", "recorrente", "mensalidade", "plano"] },
      { name: "calendar-check", icon: CalendarCheck, keywords: ["assinatura", "plano mensal", "renovação", "vencimento"] },
      { name: "file-text", icon: FileText, keywords: ["contrato", "assinatura", "termos", "documento"] },
      
      // Telecomunicações
      { name: "phone", icon: Phone, keywords: ["telefone", "vivo", "claro", "tim", "oi", "plano", "celular"] },
      { name: "wifi", icon: Wifi, keywords: ["internet", "wifi", "vivo fibra", "claro net", "oi fibra", "banda larga"] },
      { name: "signal", icon: Signal, keywords: ["celular", "4g", "5g", "sinal", "operadora", "dados móveis"] },
      
      // Serviços de Casa
      { name: "wrench", icon: Wrench, keywords: ["manutenção", "conserto", "reparo", "técnico", "encanador", "eletricista"] },
      { name: "hammer", icon: Hammer, keywords: ["reforma", "construção", "pedreiro", "obra"] },
      { name: "paintbrush", icon: Paintbrush, keywords: ["pintura", "pintor", "reforma", "decoração"] },
      { name: "key", icon: Key, keywords: ["chaveiro", "chave", "cópia", "fechadura"] },
      { name: "home", icon: Home, keywords: ["serviços domésticos", "diarista", "faxina", "limpeza"] },
      { name: "shirt", icon: Shirt, keywords: ["lavanderia", "passar roupa", "dry clean", "5asec"] },
      { name: "washing-machine", icon: WashingMachine, keywords: ["lavanderia", "lavar roupa", "máquina de lavar"] },
      
      // Beleza e Cuidados Pessoais
      { name: "scissors", icon: Scissors, keywords: ["salão", "cabelo", "barbearia", "corte", "cabeleireiro"] },
      { name: "sparkles", icon: Sparkles, keywords: ["beleza", "estética", "spa", "manicure", "pedicure"] },
      { name: "brush", icon: Brush, keywords: ["maquiagem", "make", "salão de beleza"] },
      { name: "user", icon: User, keywords: ["personal", "personal trainer", "coach", "profissional"] },
      
      // Educação Online
      { name: "graduation-cap", icon: GraduationCap, keywords: ["curso online", "udemy", "coursera", "alura", "domestika", "hotmart"] },
      { name: "book-open", icon: BookOpen, keywords: ["ebook", "kindle", "leitura digital", "kobo"] },
      { name: "monitor", icon: Monitor, keywords: ["curso online", "aula", "live", "webinar", "zoom", "meet"] },
      
      // Saúde e Bem-estar
      { name: "heart-pulse", icon: HeartPulse, keywords: ["academia", "smart fit", "bio ritmo", "gympass", "totalpass"] },
      { name: "dumbbell", icon: Dumbbell, keywords: ["academia", "smart fit", "musculação", "crossfit", "gympass"] },
      { name: "activity", icon: Activity, keywords: ["saúde", "monitoramento", "apple watch", "mi band", "garmin"] },
      { name: "stethoscope", icon: Stethoscope, keywords: ["telemedicina", "dr consulta", "conexa", "consulta online"] },
      { name: "pill", icon: Pill, keywords: ["farmácia", "drogasil", "droga raia", "pague menos", "medicamento"] },
      
      // Segurança e Monitoramento
      { name: "shield-check", icon: ShieldCheck, keywords: ["seguro", "porto seguro", "sulamerica", "bradesco seguros", "proteção"] },
      { name: "cctv", icon: Cctv, keywords: ["monitoramento", "câmera", "segurança", "vigilância"] },
      { name: "bell-ring", icon: BellRing, keywords: ["alarme", "monitoramento", "segurança residencial"] },
      
      // E-commerce e Marketplaces
      { name: "shopping-cart", icon: ShoppingCart, keywords: ["mercado livre", "amazon", "shopee", "magalu", "americanas", "compras online"] },
      { name: "store", icon: Store, keywords: ["loja virtual", "e-commerce", "marketplace", "shopify"] },
      { name: "barcode", icon: Barcode, keywords: ["boleto", "pagamento", "código de barras", "cobrança"] },
    ],
  },
  {
    name: "Social",
    icons: [
      { name: "thumbs-up", icon: ThumbsUp, keywords: ["curtir", "like", "aprovar"] },
      { name: "thumbs-down", icon: ThumbsDown, keywords: ["não curtir", "deslike", "reprovar"] },
      { name: "message-square-more", icon: MessageSquareMore, keywords: ["comentários", "chat", "mais"] },
      { name: "message-square-heart", icon: MessageSquareHeart, keywords: ["mensagem amor", "curtir"] },
      { name: "messages-square", icon: MessagesSquare, keywords: ["conversa", "chat", "diálogo", "whatsapp", "telegram"] },
      { name: "quote", icon: Quote, keywords: ["citação", "aspas", "texto"] },
      { name: "share", icon: Share, keywords: ["compartilhar", "enviar", "divulgar"] },
      { name: "heart", icon: Heart, keywords: ["curtir", "amor", "favorito", "instagram", "like"] },
      { name: "heart-handshake", icon: HeartHandshake, keywords: ["parceria", "acordo", "união"] },
      { name: "handshake", icon: Handshake, keywords: ["acordo", "negócio", "parceria"] },
      { name: "at-sign", icon: AtSign, keywords: ["email", "arroba", "menção", "instagram", "twitter"] },
      { name: "hash", icon: Hash, keywords: ["hashtag", "twitter", "instagram", "trending"] },
      { name: "globe", icon: Globe, keywords: ["internet", "web", "site", "online"] },
    ],
  },
  {
    name: "Tempo",
    icons: [
      { name: "hourglass", icon: Hourglass, keywords: ["ampulheta", "tempo", "espera"] },
      { name: "calendar-clock", icon: CalendarClock, keywords: ["agenda", "horário", "evento"] },
      { name: "calendar-check", icon: CalendarCheck, keywords: ["evento confirmado", "marcado"] },
      { name: "calendar-plus", icon: CalendarPlus, keywords: ["novo evento", "adicionar"] },
      { name: "calendar-x", icon: CalendarX, keywords: ["evento cancelado", "erro"] },
      { name: "calendar-range", icon: CalendarRange, keywords: ["período", "intervalo", "datas"] },
      { name: "calendar-heart", icon: CalendarHeart, keywords: ["data especial", "aniversário"] },
      { name: "history", icon: History, keywords: ["histórico", "passado", "registro"] },
      { name: "timer-reset", icon: TimerReset, keywords: ["resetar", "reiniciar", "cronômetro"] },
      { name: "sunrise", icon: Sunrise, keywords: ["nascer do sol", "manhã", "amanhecer"] },
      { name: "sunset", icon: Sunset, keywords: ["pôr do sol", "tarde", "entardecer"] },
      { name: "alarm-clock", icon: AlarmClock, keywords: ["despertador", "alarme", "acordar"] },
      { name: "clock-3", icon: Clock3, keywords: ["3 horas", "relógio", "tempo"] },
      { name: "clock-12", icon: Clock12, keywords: ["meio-dia", "meia-noite", "12 horas"] },
    ],
  },
  {
    name: "Busca",
    icons: [
      { name: "search", icon: Search, keywords: ["buscar", "pesquisar", "procurar"] },
      { name: "search-check", icon: SearchCheck, keywords: ["busca ok", "encontrado", "verificado"] },
      { name: "search-code", icon: SearchCode, keywords: ["buscar código", "programação"] },
      { name: "search-x", icon: SearchX, keywords: ["busca erro", "não encontrado"] },
    ],
  },
  {
    name: "Automação e IA",
    icons: [
      { name: "bot", icon: Bot, keywords: ["robô", "automação", "IA", "chatbot"] },
      { name: "bot-message-square", icon: BotMessageSquare, keywords: ["chatbot", "conversa", "IA"] },
      { name: "sparkles", icon: Sparkles, keywords: ["IA", "mágica", "inteligência artificial"] },
      { name: "wand-2", icon: Wand2, keywords: ["mágica", "automação", "edição"] },
      { name: "workflow", icon: Workflow, keywords: ["fluxo", "processo", "automação"] },
      { name: "cog", icon: Cog, keywords: ["configuração", "automação", "sistema"] },
      { name: "code", icon: Code, keywords: ["programação", "desenvolvimento", "software"] },
      { name: "code-xml", icon: CodeXml, keywords: ["xml", "html", "marcação"] },
      { name: "terminal", icon: Terminal, keywords: ["terminal", "CLI", "linha de comando"] },
      { name: "square-terminal", icon: SquareTerminal, keywords: ["console", "comando", "programação"] },
      { name: "braces", icon: Braces, keywords: ["código", "JSON", "programação"] },
      { name: "binary", icon: Binary, keywords: ["binário", "dados", "computação"] },
    ],
  },
  {
    name: "Símbolos",
    icons: [
      { name: "plus", icon: Plus, keywords: ["mais", "adicionar", "novo"] },
      { name: "minus", icon: Minus, keywords: ["menos", "remover", "subtrair"] },
      { name: "x", icon: X, keywords: ["fechar", "cancelar", "remover"] },
      { name: "check", icon: Check, keywords: ["confirmar", "ok", "correto"] },
      { name: "equal", icon: Equal, keywords: ["igual", "mesmo", "equivalente"] },
      { name: "asterisk", icon: Asterisk, keywords: ["asterisco", "importante", "nota"] },
      { name: "arrow-up", icon: ArrowUp, keywords: ["cima", "subir", "aumentar"] },
      { name: "arrow-down", icon: ArrowDown, keywords: ["baixo", "descer", "diminuir"] },
      { name: "arrow-left", icon: ArrowLeft, keywords: ["esquerda", "voltar", "anterior"] },
      { name: "arrow-right", icon: ArrowRight, keywords: ["direita", "avançar", "próximo"] },
      { name: "circle-plus", icon: CirclePlus, keywords: ["adicionar", "mais", "criar"] },
      { name: "circle-minus", icon: CircleMinus, keywords: ["remover", "menos", "excluir"] },
      { name: "circle-check", icon: CircleCheck, keywords: ["sucesso", "ok", "verificado"] },
      { name: "chevron-up", icon: ChevronUp, keywords: ["expandir", "abrir", "mais"] },
      { name: "chevron-down", icon: ChevronDown, keywords: ["recolher", "fechar", "menos"] },
      { name: "more-horizontal", icon: MoreHorizontal, keywords: ["mais opções", "menu", "horizontal"] },
      { name: "more-vertical", icon: MoreVertical, keywords: ["mais opções", "menu", "vertical"] },
      { name: "grip", icon: Grip, keywords: ["arrastar", "mover", "reordenar"] },
      { name: "menu", icon: Menu, keywords: ["menu", "hambúrguer", "navegação"] },
      { name: "layout-grid", icon: LayoutGrid, keywords: ["grade", "grid", "layout"] },
      { name: "list", icon: List, keywords: ["lista", "itens", "linhas"] },
      { name: "table", icon: Table, keywords: ["tabela", "dados", "planilha"] },
      { name: "kanban", icon: Kanban, keywords: ["kanban", "quadro", "tarefas"] },
      { name: "git-branch", icon: GitBranch, keywords: ["branch", "git", "versão"] },
      { name: "infinity", icon: Infinity, keywords: ["infinito", "ilimitado", "eterno"] },
      { name: "anchor", icon: Anchor, keywords: ["âncora", "porto", "náutico"] },
      { name: "feather", icon: Feather, keywords: ["pena", "leve", "escrita"] },
      { name: "hexagon", icon: Hexagon, keywords: ["hexágono", "forma", "geometria"] },
      { name: "circle", icon: Circle, keywords: ["círculo", "forma", "redondo"] },
      { name: "diamond", icon: Diamond, keywords: ["diamante", "losango", "forma"] },
      { name: "shapes", icon: Shapes, keywords: ["formas", "geometria", "figuras"] },
    ],
  },
];

const ALL_ICONS = ICON_CATEGORIES.flatMap(cat => cat.icons);

// Suggested icons for expense categories
const EXPENSE_SUGGESTED_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "utensils", icon: Utensils, label: "Alimentação" },
  { name: "home", icon: Home, label: "Moradia" },
  { name: "car", icon: Car, label: "Transporte" },
  { name: "heart", icon: Heart, label: "Saúde" },
  { name: "shopping-bag", icon: ShoppingBag, label: "Compras" },
  { name: "gamepad-2", icon: Gamepad2, label: "Lazer" },
  { name: "graduation-cap", icon: GraduationCap, label: "Educação" },
  { name: "credit-card", icon: CreditCard, label: "Financeiro" },
  { name: "scissors", icon: Scissors, label: "Serviços" },
  { name: "baby", icon: Baby, label: "Família" },
  { name: "dog", icon: Dog, label: "Pets" },
  { name: "gift", icon: Gift, label: "Presentes" },
];

// Suggested icons for income categories
const INCOME_SUGGESTED_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "wallet", icon: Wallet, label: "Salário" },
  { name: "trending-up", icon: TrendingUp, label: "Investimentos" },
  { name: "banknote", icon: Banknote, label: "Bônus" },
  { name: "piggy-bank", icon: PiggyBank, label: "Poupança" },
  { name: "briefcase", icon: Briefcase, label: "Freelance" },
  { name: "laptop", icon: Laptop, label: "Renda Extra" },
  { name: "building-2", icon: Building2, label: "Aluguel" },
  { name: "hand-coins", icon: HandCoins, label: "Reembolso" },
  { name: "coins", icon: Coins, label: "Dividendos" },
  { name: "receipt", icon: Receipt, label: "Restituição" },
  { name: "gift", icon: Gift, label: "Presente" },
  { name: "users", icon: Users, label: "Rateio" },
];

// Portuguese synonyms for search
const PORTUGUESE_SYNONYMS: Record<string, string[]> = {
  // Alimentação
  "comida": ["utensils", "pizza", "sandwich", "beef"],
  "restaurante": ["utensils", "utensils-crossed", "wine"],
  "mercado": ["shopping-cart", "store", "apple"],
  "supermercado": ["shopping-cart", "store"],
  "lanche": ["pizza", "sandwich", "cookie"],
  "cafe": ["coffee", "croissant"],
  "bar": ["wine", "beer"],
  "padaria": ["croissant", "wheat", "cake"],
  "delivery": ["bike", "package", "shopping-bag"],
  // Transporte
  "carro": ["car", "car-front", "fuel"],
  "gasolina": ["fuel", "car", "gauge"],
  "combustivel": ["fuel", "gauge"],
  "onibus": ["bus", "train"],
  "metro": ["train", "train-front"],
  "uber": ["car-taxi-front", "car"],
  "viagem": ["plane", "plane-takeoff", "luggage"],
  "estacionamento": ["circle-parking", "car"],
  // Moradia
  "casa": ["home", "house", "key"],
  "aluguel": ["key", "home", "building"],
  "luz": ["lightbulb", "plug", "zap"],
  "energia": ["lightbulb", "zap", "plug"],
  "agua": ["droplets", "shower-head"],
  "internet": ["wifi", "globe", "signal"],
  "condominio": ["building", "key", "users"],
  // Saúde
  "medico": ["stethoscope", "hospital", "cross"],
  "farmacia": ["pill", "syringe", "cross"],
  "remedio": ["pill", "syringe"],
  "plano": ["shield-plus", "heart", "hospital"],
  "academia": ["dumbbell", "heart-pulse", "trophy"],
  "dentista": ["smile", "heart", "stethoscope"],
  // Lazer
  "netflix": ["tv", "film", "play"],
  "spotify": ["music", "headphones", "play"],
  "cinema": ["film", "clapperboard", "ticket"],
  "jogo": ["gamepad-2", "gamepad", "joystick"],
  "livro": ["book", "book-open", "library"],
  "festa": ["party-popper", "gift", "cake"],
  // Trabalho/Receita
  "salario": ["wallet", "banknote", "briefcase"],
  "bonus": ["banknote", "gift", "trending-up"],
  "freelance": ["laptop", "briefcase", "code"],
  "investimento": ["trending-up", "piggy-bank", "coins"],
  "dividendo": ["coins", "trending-up", "chart-line"],
  "pix": ["qr-code", "smartphone", "banknote"],
  "transferencia": ["banknote", "arrow-right", "wallet"],
};

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  color?: string;
  categoryType?: 'expense' | 'income';
  height?: string;
}

export function IconPicker({ value, onChange, color = "#6366f1", categoryType, height }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const suggestedIcons = categoryType === 'income' ? INCOME_SUGGESTED_ICONS : EXPENSE_SUGGESTED_ICONS;

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return ICON_CATEGORIES;

    const searchLower = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Check synonyms first
    const synonymMatches = PORTUGUESE_SYNONYMS[searchLower] || [];
    
    return ICON_CATEGORIES.map(category => ({
      ...category,
      icons: category.icons.filter(
        icon =>
          synonymMatches.includes(icon.name) ||
          icon.name.includes(searchLower) ||
          icon.keywords.some(kw => 
            kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchLower)
          ) ||
          category.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchLower)
      ),
    })).filter(category => category.icons.length > 0);
  }, [search]);

  const selectedIcon = ALL_ICONS.find(i => i.name === value);
  const SelectedIconComponent = selectedIcon?.icon || Tag;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center transition-all"
          style={{ backgroundColor: color }}
        >
          <SelectedIconComponent className="h-6 w-6 text-white" />
        </div>
        <div className="text-sm text-muted-foreground">
          Ícone selecionado: <span className="font-medium text-foreground">{selectedIcon?.name || "tag"}</span>
        </div>
      </div>

      <Input
        placeholder="Buscar ícone... (ex: comida, carro, salário)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9"
      />

      <ScrollArea className={cn("rounded-lg border bg-muted/30 p-3", height || "h-[400px]")}>
        <div className="space-y-2 pb-4">
          {/* Suggested icons section - only show when not searching */}
          {!search.trim() && (
            <div className="mb-3">
              <p className="text-xs font-medium text-primary mb-2 px-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Sugeridos para {categoryType === 'income' ? 'Receitas' : 'Despesas'}
              </p>
              <div className="grid grid-cols-5 gap-2 mb-1">
                {suggestedIcons.map((iconOption) => {
                  const IconComponent = iconOption.icon;
                  const isSelected = value === iconOption.name;
                  return (
                    <button
                      key={iconOption.name}
                      type="button"
                      onClick={() => onChange(iconOption.name)}
                      className={cn(
                        "h-auto py-2.5 px-2 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all",
                        "hover:bg-primary/10 hover:scale-105",
                        isSelected && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background"
                      )}
                      title={iconOption.label}
                    >
                      <IconComponent className="h-6 w-6" />
                      <span className="text-[10px] leading-tight truncate w-full text-center">
                        {iconOption.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border-b border-border/50 my-3" />
            </div>
          )}

          {/* Accordion for icon categories */}
          {search.trim() ? (
            // When searching, show flat list without accordion
            filteredCategories.map((category) => (
              <div key={category.name} className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  {category.name}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {category.icons.map((iconOption) => {
                    const IconComponent = iconOption.icon;
                    const isSelected = value === iconOption.name;
                    return (
                      <button
                        key={iconOption.name}
                        type="button"
                        onClick={() => onChange(iconOption.name)}
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center transition-all",
                          "hover:bg-primary/10 hover:scale-110",
                          isSelected && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}
                        title={iconOption.name}
                      >
                        <IconComponent className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            // When not searching, show accordion
            <Accordion type="multiple" defaultValue={[filteredCategories[0]?.name]} className="w-full">
              {filteredCategories.map((category) => {
                // Get the first icon of the category as preview
                const PreviewIcon = category.icons[0]?.icon;
                return (
                  <AccordionItem 
                    key={category.name} 
                    value={category.name}
                    className="border-b-0 border border-border/50 rounded-lg mb-2 overflow-hidden bg-background/50"
                  >
                    <AccordionTrigger className="py-2.5 px-3 hover:no-underline hover:bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        {PreviewIcon && <PreviewIcon className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{category.name}</span>
                        <span className="text-xs text-muted-foreground">({category.icons.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 pt-1">
                      <div className="grid grid-cols-6 gap-2">
                        {category.icons.map((iconOption) => {
                          const IconComponent = iconOption.icon;
                          const isSelected = value === iconOption.name;
                          return (
                            <button
                              key={iconOption.name}
                              type="button"
                              onClick={() => onChange(iconOption.name)}
                              className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center transition-all",
                                "hover:bg-primary/10 hover:scale-110",
                                isSelected && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                              )}
                              title={iconOption.name}
                            >
                              <IconComponent className="h-5 w-5" />
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
          
          {filteredCategories.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhum ícone encontrado
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function CategoryIcon({ 
  name, 
  className,
  color 
}: { 
  name: string; 
  className?: string;
  color?: string;
}) {
  const iconOption = ALL_ICONS.find(i => i.name === name);
  const IconComponent = iconOption?.icon || Tag;
  return <IconComponent className={className} style={color ? { color } : undefined} />;
}
