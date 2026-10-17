import { MORE as M1, MORE2, type MoreKey, type MoreKey2 } from "./i18n-more";
const MORE: Record<string, Record<string, string>> = { ...M1, ...MORE2 };
// Central UI strings. EN is the source text. Every other language is MACHINE-WRITTEN (not reviewed by a native speaker)
// and covers the core interface only. Anything missing in a language falls back to English. Team and player names are never translated.
export const LANGS = [
  ["id", "Bahasa Indonesia"], ["ms", "Bahasa Melayu"], ["en", "English"], ["ja", "日本語"], ["ko", "한국어"], ["zh", "中文"], ["fr", "Français"], ["es", "Español"], ["pt", "Português"],
] as const;
export type Lang = (typeof LANGS)[number][0];
export const DEFAULT_LANG: Lang = "id";
export const LANG_CODES = LANGS.map((l) => l[0]) as string[];

const en = {
  "nav.today": "Today", "nav.tournament": "Tournament", "hdr.settings": "Settings", "nav.home": "Home", "nav.matches": "Matches", "nav.standings": "Standings", "nav.teams": "Teams", "nav.recaps": "Recaps", "nav.stats": "Statistics", "nav.predictions": "Predictions", "nav.groups": "Friends league",
  "hdr.search": "Search", "hdr.menu": "Menu", "hdr.skip": "Skip to content", "hdr.spoilersHidden": "Spoilers hidden", "hdr.spoilersShown": "Spoilers shown", "hdr.language": "Language", "hdr.timezone": "Time zone", "hdr.moreMatches": "More in Matches",
  "state.live": "Live", "state.final": "Final", "state.scheduled": "Upcoming", "state.tbd": "To be decided",
  "flt.all": "All", "flt.live": "Live", "flt.upcoming": "Upcoming", "flt.completed": "Completed", "flt.list": "List", "flt.calendar": "Calendar", "flt.myTeams": "My teams",
  "act.showResult": "Show result", "act.showSession": "Show for this session", "act.share": "Share", "act.follow": "Follow", "act.unfollow": "Unfollow", "act.h2h": "Head-to-head", "act.copyLink": "Copy link", "act.copied": "Copied", "act.shareScore": "Share with score", "act.downloadCard": "Download card",
  "spoiler.hidden": "Results are hidden (spoiler-free mode).",
  "lang.machine": "Translations are machine-written and may have mistakes. Team and player names are not translated. English is the fallback.",
  "today.title": "Today", "today.sub": "Matches on your local date, with live countdowns.", "today.live": "Live now", "today.next": "Next match", "today.startsIn": "Starts in", "today.none": "No matches on this date.", "today.followed": "Your followed teams", "today.all": "All matches today", "today.nextDay": "Next match day", "today.started": "Started",
  "notif.title": "Match notifications", "notif.turnOn": "Turn on notifications", "notif.turnOff": "Turn off", "notif.soon": "Starting soon", "notif.live": "Live", "notif.final": "Result",
  "grp.title": "Friends league", "grp.create": "Create a league", "grp.join": "Join", "grp.name": "Your display name", "grp.leagueName": "League name", "grp.leaderboard": "Leaderboard", "grp.share": "Share this link with friends",
  "pred.title": "My predictions",
} as const;
export type Key = keyof typeof en | MoreKey | MoreKey2;
type Dict = Partial<Record<keyof typeof en, string>>;

const id: Dict = {
  "nav.tournament": "Turnamen", "hdr.settings": "Pengaturan",
  "act.shareScore": "Bagikan dengan skor", "act.downloadCard": "Unduh kartu",
  "nav.today": "Hari ini", "nav.home": "Beranda", "nav.matches": "Pertandingan", "nav.standings": "Klasemen", "nav.teams": "Tim", "nav.recaps": "Rangkuman", "nav.stats": "Statistik", "nav.predictions": "Prediksi", "nav.groups": "Liga teman",
  "hdr.search": "Cari", "hdr.menu": "Menu", "hdr.skip": "Langsung ke konten", "hdr.spoilersHidden": "Spoiler disembunyikan", "hdr.spoilersShown": "Spoiler ditampilkan", "hdr.language": "Bahasa", "hdr.timezone": "Zona waktu", "hdr.moreMatches": "Lainnya di Pertandingan",
  "state.live": "Live", "state.final": "Selesai", "state.scheduled": "Akan datang", "state.tbd": "Belum ditentukan",
  "flt.all": "Semua", "flt.live": "Live", "flt.upcoming": "Akan datang", "flt.completed": "Selesai", "flt.list": "Daftar", "flt.calendar": "Kalender", "flt.myTeams": "Tim saya",
  "act.showResult": "Tampilkan hasil", "act.showSession": "Tampilkan untuk sesi ini", "act.share": "Bagikan", "act.follow": "Ikuti", "act.unfollow": "Berhenti ikuti", "act.h2h": "Rekor pertemuan", "act.copyLink": "Salin tautan", "act.copied": "Tersalin",
  "spoiler.hidden": "Hasil disembunyikan (mode bebas spoiler).",
  "lang.machine": "Terjemahan ditulis mesin dan mungkin ada kesalahan. Nama tim dan pemain tidak diterjemahkan. Bahasa Inggris dipakai sebagai cadangan.",
  "today.title": "Hari ini", "today.sub": "Pertandingan di tanggal lokalmu, dengan hitung mundur langsung.", "today.live": "Sedang berlangsung", "today.next": "Pertandingan berikutnya", "today.startsIn": "Mulai dalam", "today.none": "Tidak ada pertandingan di tanggal ini.", "today.followed": "Tim yang kamu ikuti", "today.all": "Semua pertandingan hari ini", "today.nextDay": "Hari pertandingan berikutnya", "today.started": "Sudah mulai",
  "notif.title": "Notifikasi pertandingan", "notif.turnOn": "Aktifkan notifikasi", "notif.turnOff": "Matikan", "notif.soon": "Segera mulai", "notif.live": "Live", "notif.final": "Hasil",
  "grp.title": "Liga teman", "grp.create": "Buat liga", "grp.join": "Gabung", "grp.name": "Nama tampilanmu", "grp.leagueName": "Nama liga", "grp.leaderboard": "Papan peringkat", "grp.share": "Bagikan tautan ini ke teman",
  "pred.title": "Prediksiku",
};
const ms: Dict = {
  "nav.tournament": "Kejohanan", "hdr.settings": "Tetapan",
  "act.shareScore": "Kongsi dengan skor", "act.downloadCard": "Muat turun kad",
  "nav.today": "Hari ini", "nav.home": "Utama", "nav.matches": "Perlawanan", "nav.standings": "Kedudukan", "nav.teams": "Pasukan", "nav.recaps": "Rumusan", "nav.stats": "Statistik", "nav.predictions": "Ramalan", "nav.groups": "Liga rakan",
  "hdr.search": "Cari", "hdr.menu": "Menu", "hdr.skip": "Terus ke kandungan", "hdr.spoilersHidden": "Spoiler disembunyikan", "hdr.spoilersShown": "Spoiler dipaparkan", "hdr.language": "Bahasa", "hdr.timezone": "Zon waktu", "hdr.moreMatches": "Lagi dalam Perlawanan",
  "state.live": "Langsung", "state.final": "Tamat", "state.scheduled": "Akan datang", "state.tbd": "Belum ditentukan",
  "flt.all": "Semua", "flt.live": "Langsung", "flt.upcoming": "Akan datang", "flt.completed": "Selesai", "flt.list": "Senarai", "flt.calendar": "Kalendar", "flt.myTeams": "Pasukan saya",
  "act.showResult": "Papar keputusan", "act.showSession": "Papar untuk sesi ini", "act.share": "Kongsi", "act.follow": "Ikut", "act.unfollow": "Nyahikut", "act.h2h": "Rekod pertemuan", "act.copyLink": "Salin pautan", "act.copied": "Disalin",
  "spoiler.hidden": "Keputusan disembunyikan (mod bebas spoiler).",
  "lang.machine": "Terjemahan ditulis mesin dan mungkin ada kesilapan. Nama pasukan dan pemain tidak diterjemahkan. Bahasa Inggeris digunakan sebagai sandaran.",
  "today.title": "Hari ini", "today.sub": "Perlawanan pada tarikh tempatan anda, dengan kiraan detik langsung.", "today.live": "Sedang berlangsung", "today.next": "Perlawanan seterusnya", "today.startsIn": "Bermula dalam", "today.none": "Tiada perlawanan pada tarikh ini.", "today.followed": "Pasukan yang anda ikuti", "today.all": "Semua perlawanan hari ini", "today.nextDay": "Hari perlawanan seterusnya", "today.started": "Sudah bermula",
  "notif.title": "Pemberitahuan perlawanan", "notif.turnOn": "Hidupkan pemberitahuan", "notif.turnOff": "Matikan", "notif.soon": "Akan bermula", "notif.live": "Langsung", "notif.final": "Keputusan",
  "grp.title": "Liga rakan", "grp.create": "Cipta liga", "grp.join": "Sertai", "grp.name": "Nama paparan anda", "grp.leagueName": "Nama liga", "grp.leaderboard": "Papan pendahulu", "grp.share": "Kongsi pautan ini dengan rakan",
  "pred.title": "Ramalan saya",
};
const ja: Dict = {
  "nav.tournament": "大会", "hdr.settings": "設定",
  "act.shareScore": "スコア付きで共有", "act.downloadCard": "カードを保存",
  "nav.today": "今日", "nav.home": "ホーム", "nav.matches": "試合", "nav.standings": "順位", "nav.teams": "チーム", "nav.recaps": "まとめ", "nav.stats": "統計", "nav.predictions": "予想", "nav.groups": "フレンドリーグ",
  "hdr.search": "検索", "hdr.menu": "メニュー", "hdr.skip": "本文へスキップ", "hdr.spoilersHidden": "ネタバレ非表示", "hdr.spoilersShown": "ネタバレ表示", "hdr.language": "言語", "hdr.timezone": "タイムゾーン", "hdr.moreMatches": "試合のその他",
  "state.live": "ライブ", "state.final": "終了", "state.scheduled": "予定", "state.tbd": "未定",
  "flt.all": "すべて", "flt.live": "ライブ", "flt.upcoming": "予定", "flt.completed": "終了", "flt.list": "リスト", "flt.calendar": "カレンダー", "flt.myTeams": "マイチーム",
  "act.showResult": "結果を表示", "act.showSession": "このセッションで表示", "act.share": "共有", "act.follow": "フォロー", "act.unfollow": "フォロー解除", "act.h2h": "対戦成績", "act.copyLink": "リンクをコピー", "act.copied": "コピーしました",
  "spoiler.hidden": "結果は非表示です（ネタバレ防止モード）。",
  "lang.machine": "翻訳は機械で作成されたもので、誤りがある可能性があります。チーム名と選手名は翻訳されません。未翻訳の部分は英語で表示されます。",
  "today.title": "今日", "today.sub": "あなたの現地日付の試合とライブカウントダウン。", "today.live": "ライブ中", "today.next": "次の試合", "today.startsIn": "開始まで", "today.none": "この日の試合はありません。", "today.followed": "フォロー中のチーム", "today.all": "今日の全試合", "today.nextDay": "次の試合日", "today.started": "開始済み",
  "notif.title": "試合通知", "notif.turnOn": "通知をオンにする", "notif.turnOff": "オフにする", "notif.soon": "まもなく開始", "notif.live": "ライブ", "notif.final": "結果",
  "grp.title": "フレンドリーグ", "grp.create": "リーグを作成", "grp.join": "参加", "grp.name": "表示名", "grp.leagueName": "リーグ名", "grp.leaderboard": "ランキング", "grp.share": "このリンクを友達に共有",
  "pred.title": "私の予想",
};
const ko: Dict = {
  "nav.tournament": "대회", "hdr.settings": "설정",
  "act.shareScore": "점수 포함 공유", "act.downloadCard": "카드 다운로드",
  "nav.today": "오늘", "nav.home": "홈", "nav.matches": "경기", "nav.standings": "순위", "nav.teams": "팀", "nav.recaps": "요약", "nav.stats": "통계", "nav.predictions": "예측", "nav.groups": "친구 리그",
  "hdr.search": "검색", "hdr.menu": "메뉴", "hdr.skip": "본문으로 건너뛰기", "hdr.spoilersHidden": "스포일러 숨김", "hdr.spoilersShown": "스포일러 표시", "hdr.language": "언어", "hdr.timezone": "시간대", "hdr.moreMatches": "경기 더보기",
  "state.live": "라이브", "state.final": "종료", "state.scheduled": "예정", "state.tbd": "미정",
  "flt.all": "전체", "flt.live": "라이브", "flt.upcoming": "예정", "flt.completed": "종료", "flt.list": "목록", "flt.calendar": "달력", "flt.myTeams": "내 팀",
  "act.showResult": "결과 보기", "act.showSession": "이번 세션에서 보기", "act.share": "공유", "act.follow": "팔로우", "act.unfollow": "팔로우 취소", "act.h2h": "상대 전적", "act.copyLink": "링크 복사", "act.copied": "복사됨",
  "spoiler.hidden": "결과가 숨겨져 있습니다 (스포일러 방지 모드).",
  "lang.machine": "번역은 기계가 작성했으며 오류가 있을 수 있습니다. 팀 및 선수 이름은 번역하지 않습니다. 번역이 없는 부분은 영어로 표시됩니다.",
  "today.title": "오늘", "today.sub": "현지 날짜의 경기와 실시간 카운트다운.", "today.live": "진행 중", "today.next": "다음 경기", "today.startsIn": "시작까지", "today.none": "이 날짜에는 경기가 없습니다.", "today.followed": "팔로우한 팀", "today.all": "오늘의 모든 경기", "today.nextDay": "다음 경기일", "today.started": "시작됨",
  "notif.title": "경기 알림", "notif.turnOn": "알림 켜기", "notif.turnOff": "끄기", "notif.soon": "곧 시작", "notif.live": "라이브", "notif.final": "결과",
  "grp.title": "친구 리그", "grp.create": "리그 만들기", "grp.join": "참가", "grp.name": "표시 이름", "grp.leagueName": "리그 이름", "grp.leaderboard": "순위표", "grp.share": "이 링크를 친구에게 공유하세요",
  "pred.title": "내 예측",
};
const zh: Dict = {
  "nav.tournament": "赛事", "hdr.settings": "设置",
  "act.shareScore": "分享（含比分）", "act.downloadCard": "下载卡片",
  "nav.today": "今日", "nav.home": "首页", "nav.matches": "比赛", "nav.standings": "积分榜", "nav.teams": "战队", "nav.recaps": "战报", "nav.stats": "数据", "nav.predictions": "预测", "nav.groups": "好友联赛",
  "hdr.search": "搜索", "hdr.menu": "菜单", "hdr.skip": "跳到内容", "hdr.spoilersHidden": "已隐藏剧透", "hdr.spoilersShown": "已显示剧透", "hdr.language": "语言", "hdr.timezone": "时区", "hdr.moreMatches": "比赛更多",
  "state.live": "直播中", "state.final": "已结束", "state.scheduled": "即将开始", "state.tbd": "待定",
  "flt.all": "全部", "flt.live": "直播中", "flt.upcoming": "即将开始", "flt.completed": "已结束", "flt.list": "列表", "flt.calendar": "日历", "flt.myTeams": "我的战队",
  "act.showResult": "显示结果", "act.showSession": "本次会话显示", "act.share": "分享", "act.follow": "关注", "act.unfollow": "取消关注", "act.h2h": "交锋记录", "act.copyLink": "复制链接", "act.copied": "已复制",
  "spoiler.hidden": "结果已隐藏（防剧透模式）。",
  "lang.machine": "翻译由机器生成，可能有错误。战队和选手名称不翻译。未翻译的内容以英文显示。",
  "today.title": "今日", "today.sub": "您当地日期的比赛，附实时倒计时。", "today.live": "正在进行", "today.next": "下一场比赛", "today.startsIn": "距开始", "today.none": "这一天没有比赛。", "today.followed": "您关注的战队", "today.all": "今日全部比赛", "today.nextDay": "下一个比赛日", "today.started": "已开始",
  "notif.title": "比赛通知", "notif.turnOn": "开启通知", "notif.turnOff": "关闭", "notif.soon": "即将开始", "notif.live": "直播中", "notif.final": "结果",
  "grp.title": "好友联赛", "grp.create": "创建联赛", "grp.join": "加入", "grp.name": "您的显示名称", "grp.leagueName": "联赛名称", "grp.leaderboard": "排行榜", "grp.share": "把此链接分享给朋友",
  "pred.title": "我的预测",
};
const fr: Dict = {
  "nav.tournament": "Tournoi", "hdr.settings": "Réglages",
  "act.shareScore": "Partager avec le score", "act.downloadCard": "Télécharger la carte",
  "nav.today": "Aujourd'hui", "nav.home": "Accueil", "nav.matches": "Matchs", "nav.standings": "Classement", "nav.teams": "Équipes", "nav.recaps": "Résumés", "nav.stats": "Statistiques", "nav.predictions": "Pronostics", "nav.groups": "Ligue d'amis",
  "hdr.search": "Rechercher", "hdr.menu": "Menu", "hdr.skip": "Aller au contenu", "hdr.spoilersHidden": "Spoilers masqués", "hdr.spoilersShown": "Spoilers affichés", "hdr.language": "Langue", "hdr.timezone": "Fuseau horaire", "hdr.moreMatches": "Plus dans Matchs",
  "state.live": "En direct", "state.final": "Terminé", "state.scheduled": "À venir", "state.tbd": "À déterminer",
  "flt.all": "Tous", "flt.live": "En direct", "flt.upcoming": "À venir", "flt.completed": "Terminés", "flt.list": "Liste", "flt.calendar": "Calendrier", "flt.myTeams": "Mes équipes",
  "act.showResult": "Afficher le résultat", "act.showSession": "Afficher pour cette session", "act.share": "Partager", "act.follow": "Suivre", "act.unfollow": "Ne plus suivre", "act.h2h": "Face-à-face", "act.copyLink": "Copier le lien", "act.copied": "Copié",
  "spoiler.hidden": "Les résultats sont masqués (mode sans spoiler).",
  "lang.machine": "Les traductions sont écrites par machine et peuvent contenir des erreurs. Les noms d'équipes et de joueurs ne sont pas traduits. L'anglais sert de repli.",
  "today.title": "Aujourd'hui", "today.sub": "Les matchs à votre date locale, avec compte à rebours en direct.", "today.live": "En direct maintenant", "today.next": "Prochain match", "today.startsIn": "Début dans", "today.none": "Aucun match à cette date.", "today.followed": "Vos équipes suivies", "today.all": "Tous les matchs du jour", "today.nextDay": "Prochain jour de match", "today.started": "Commencé",
  "notif.title": "Notifications de match", "notif.turnOn": "Activer les notifications", "notif.turnOff": "Désactiver", "notif.soon": "Bientôt", "notif.live": "En direct", "notif.final": "Résultat",
  "grp.title": "Ligue d'amis", "grp.create": "Créer une ligue", "grp.join": "Rejoindre", "grp.name": "Votre nom affiché", "grp.leagueName": "Nom de la ligue", "grp.leaderboard": "Classement", "grp.share": "Partagez ce lien avec vos amis",
  "pred.title": "Mes pronostics",
};
const es: Dict = {
  "nav.tournament": "Torneo", "hdr.settings": "Ajustes",
  "act.shareScore": "Compartir con marcador", "act.downloadCard": "Descargar tarjeta",
  "nav.today": "Hoy", "nav.home": "Inicio", "nav.matches": "Partidos", "nav.standings": "Clasificación", "nav.teams": "Equipos", "nav.recaps": "Resúmenes", "nav.stats": "Estadísticas", "nav.predictions": "Pronósticos", "nav.groups": "Liga de amigos",
  "hdr.search": "Buscar", "hdr.menu": "Menú", "hdr.skip": "Saltar al contenido", "hdr.spoilersHidden": "Spoilers ocultos", "hdr.spoilersShown": "Spoilers visibles", "hdr.language": "Idioma", "hdr.timezone": "Zona horaria", "hdr.moreMatches": "Más en Partidos",
  "state.live": "En vivo", "state.final": "Final", "state.scheduled": "Próximo", "state.tbd": "Por definir",
  "flt.all": "Todos", "flt.live": "En vivo", "flt.upcoming": "Próximos", "flt.completed": "Finalizados", "flt.list": "Lista", "flt.calendar": "Calendario", "flt.myTeams": "Mis equipos",
  "act.showResult": "Mostrar resultado", "act.showSession": "Mostrar en esta sesión", "act.share": "Compartir", "act.follow": "Seguir", "act.unfollow": "Dejar de seguir", "act.h2h": "Cara a cara", "act.copyLink": "Copiar enlace", "act.copied": "Copiado",
  "spoiler.hidden": "Los resultados están ocultos (modo sin spoilers).",
  "lang.machine": "Las traducciones están escritas por máquina y pueden tener errores. Los nombres de equipos y jugadores no se traducen. El inglés es el respaldo.",
  "today.title": "Hoy", "today.sub": "Partidos en tu fecha local, con cuenta regresiva en vivo.", "today.live": "En vivo ahora", "today.next": "Próximo partido", "today.startsIn": "Empieza en", "today.none": "No hay partidos en esta fecha.", "today.followed": "Tus equipos seguidos", "today.all": "Todos los partidos de hoy", "today.nextDay": "Próximo día de partidos", "today.started": "Empezó",
  "notif.title": "Notificaciones de partidos", "notif.turnOn": "Activar notificaciones", "notif.turnOff": "Desactivar", "notif.soon": "Empieza pronto", "notif.live": "En vivo", "notif.final": "Resultado",
  "grp.title": "Liga de amigos", "grp.create": "Crear una liga", "grp.join": "Unirse", "grp.name": "Tu nombre visible", "grp.leagueName": "Nombre de la liga", "grp.leaderboard": "Clasificación", "grp.share": "Comparte este enlace con tus amigos",
  "pred.title": "Mis pronósticos",
};
const pt: Dict = {
  "nav.tournament": "Torneio", "hdr.settings": "Configurações",
  "act.shareScore": "Compartilhar com placar", "act.downloadCard": "Baixar cartão",
  "nav.today": "Hoje", "nav.home": "Início", "nav.matches": "Partidas", "nav.standings": "Classificação", "nav.teams": "Equipes", "nav.recaps": "Resumos", "nav.stats": "Estatísticas", "nav.predictions": "Palpites", "nav.groups": "Liga de amigos",
  "hdr.search": "Buscar", "hdr.menu": "Menu", "hdr.skip": "Ir para o conteúdo", "hdr.spoilersHidden": "Spoilers ocultos", "hdr.spoilersShown": "Spoilers visíveis", "hdr.language": "Idioma", "hdr.timezone": "Fuso horário", "hdr.moreMatches": "Mais em Partidas",
  "state.live": "Ao vivo", "state.final": "Final", "state.scheduled": "Próxima", "state.tbd": "A definir",
  "flt.all": "Todas", "flt.live": "Ao vivo", "flt.upcoming": "Próximas", "flt.completed": "Encerradas", "flt.list": "Lista", "flt.calendar": "Calendário", "flt.myTeams": "Minhas equipes",
  "act.showResult": "Mostrar resultado", "act.showSession": "Mostrar nesta sessão", "act.share": "Compartilhar", "act.follow": "Seguir", "act.unfollow": "Deixar de seguir", "act.h2h": "Confronto direto", "act.copyLink": "Copiar link", "act.copied": "Copiado",
  "spoiler.hidden": "Os resultados estão ocultos (modo sem spoilers).",
  "lang.machine": "As traduções são escritas por máquina e podem conter erros. Nomes de equipes e jogadores não são traduzidos. O inglês é o padrão de reserva.",
  "today.title": "Hoje", "today.sub": "Partidas na sua data local, com contagem regressiva ao vivo.", "today.live": "Ao vivo agora", "today.next": "Próxima partida", "today.startsIn": "Começa em", "today.none": "Sem partidas nesta data.", "today.followed": "Suas equipes seguidas", "today.all": "Todas as partidas de hoje", "today.nextDay": "Próximo dia de partidas", "today.started": "Começou",
  "notif.title": "Notificações de partidas", "notif.turnOn": "Ativar notificações", "notif.turnOff": "Desativar", "notif.soon": "Começa em breve", "notif.live": "Ao vivo", "notif.final": "Resultado",
  "grp.title": "Liga de amigos", "grp.create": "Criar uma liga", "grp.join": "Entrar", "grp.name": "Seu nome de exibição", "grp.leagueName": "Nome da liga", "grp.leaderboard": "Classificação", "grp.share": "Compartilhe este link com amigos",
  "pred.title": "Meus palpites",
};

const DICTS: Record<Lang, Dict> = { id, ms, en, ja, ko, zh, fr, es, pt };

export function translate(lang: string, key: Key): string {
  if (key in MORE) { const e = MORE[key]!; return e[lang] ?? e.en!; }
  const k = key as keyof typeof en;
  return (DICTS[lang as Lang] ?? {})[k] ?? en[k];
}
