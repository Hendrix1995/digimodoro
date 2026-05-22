// Tiny i18n table. Add new keys here; missing translations fall back to en.
export type Lang = 'ko' | 'en'

type Bundle = Record<string, string>

const EN: Bundle = {
  // Top-level
  appName: 'DigiModoro',
  // Status window
  statusTitle: 'DigiModoro',
  petTitle: 'Pet',
  timerTitle: 'Timer',
  statsTitle: 'Stats',
  settingsTitle: 'Settings',
  evoHistory: 'Evolution history',
  startFocus: 'Start focus',
  pause: 'Pause',
  resume: 'Resume',
  abort: 'Abort focus',
  startBreak: 'Start break',
  skipBreak: 'Skip break',
  reset: 'Reset pet',
  showStatus: 'Show status…',
  quit: 'Quit DigiModoro',
  ripLabel: 'R.I.P. — neglected too long',
  hatchNew: 'Hatch new egg…',
  // Phases
  phaseIdle: 'idle',
  phaseFocus: 'focus',
  phaseBreak: 'break',
  phaseDone: 'fork complete',
  phasePaused: 'paused',
  // Stats
  forksThisStage: 'Forks (this stage)',
  forksTotal: 'Total forks',
  streakMiss: 'Streak miss',
  daySuffix: 'd',
  nextEvolution: 'Next evolution',
  daysUntilRip: 'Days until R.I.P.',
  ripStageMax: 'Max stage',
  ripStageMaxValue: 'No further evolution',
  // Settings labels
  language: 'Language',
  focusLength: 'Focus length',
  breakLength: 'Break length',
  notifications: 'Notifications',
  notifyForkComplete: 'On focus complete',
  notifyEvolve: 'On evolve',
  notifyBreakEnd: 'On break end',
  petSize: 'Pet size',
  // Notifications
  notifyForkCompleteTitle: 'Focus complete!',
  notifyForkCompleteBody: 'One fork added in {slot}. Take a break.',
  notifyBreakEndTitle: 'Break is over',
  notifyBreakEndBody: 'Ready for another focus block?',
  notifyEvolveTitle: 'Evolution!',
  notifyRipTitle: 'Your pet passed away',
  notifyRipBody: 'Neglected too long. Reset to hatch a new egg.',
  // Bubble
  bubbleForkAdded: '+1 {slot}',
  bubbleBreakOver: 'Break over!',
  bubbleRip: 'R.I.P.',
  // Slots
  slot_morning: 'morning',
  slot_forenoon: 'forenoon',
  slot_midday: 'midday',
  slot_evening: 'evening',
  slot_night: 'night',
  // Stages
  stage_egg: 'egg',
  stage_fresh: 'fresh',
  stage_baby: 'baby',
  stage_child: 'child',
  stage_adult: 'adult',
  stage_perfect: 'perfect',
  stage_mega: 'mega',
  // Personalities
  personality_calm: 'calm',
  personality_gentle: 'gentle',
  personality_holy: 'holy',
  personality_mischief: 'mischief',
  personality_savage: 'savage',
  // Misc
  minutes: 'min',
  seconds: 'sec',
  on: 'on',
  off: 'off',
  // Confirmations
  confirmAbort: 'Abort focus? No XP will be awarded.',
  confirmReset: 'Reset pet? Current pet will be moved to graveyard.',
  cancel: 'Cancel',
  confirmYes: 'OK',
  // Graveyard
  graveyardTitle: 'Graveyard',
  graveyardEmpty: 'No past pets yet.',
  graveyardLifespan: 'lived',
  graveyardEvoCount: 'evolutions',
  graveyardForks: 'forks',
  graveyardRipCause: 'R.I.P.',
  graveyardReset: 'reset',
}

const KO: Bundle = {
  appName: 'DigiModoro',
  statusTitle: 'DigiModoro',
  petTitle: '펫',
  timerTitle: '타이머',
  statsTitle: '통계',
  settingsTitle: '설정',
  evoHistory: '진화 이력',
  startFocus: '집중 시작',
  pause: '일시정지',
  resume: '재개',
  abort: '집중 중지',
  startBreak: '휴식 시작',
  skipBreak: '휴식 건너뛰기',
  reset: '펫 리셋',
  showStatus: '상태 창 열기…',
  quit: '종료',
  ripLabel: 'R.I.P. — 방치가 너무 길었어요',
  hatchNew: '새 알 부화…',
  phaseIdle: '대기',
  phaseFocus: '집중',
  phaseBreak: '휴식',
  phaseDone: '완료',
  phasePaused: '일시정지',
  forksThisStage: '이번 단계 포크',
  forksTotal: '총 포크',
  streakMiss: '연속 결석',
  daySuffix: '일',
  language: '언어',
  focusLength: '집중 시간',
  breakLength: '휴식 시간',
  notifications: '알림',
  notifyForkComplete: '집중 완주 시',
  notifyEvolve: '진화 시',
  notifyBreakEnd: '휴식 종료 시',
  petSize: '펫 크기',
  notifyForkCompleteTitle: '집중 완료!',
  notifyForkCompleteBody: '{slot} 슬롯에 1포크 적립. 잠시 쉬어요.',
  notifyBreakEndTitle: '휴식 종료',
  notifyBreakEndBody: '다시 집중할 준비가 됐나요?',
  notifyEvolveTitle: '진화!',
  notifyRipTitle: '펫이 세상을 떠났습니다',
  notifyRipBody: '너무 오래 방치되었어요. 리셋으로 새 알을 부화시키세요.',
  bubbleForkAdded: '+1 {slot}',
  bubbleBreakOver: '휴식 끝!',
  bubbleRip: 'R.I.P.',
  slot_morning: '아침',
  slot_forenoon: '오전',
  slot_midday: '낮',
  slot_evening: '저녁',
  slot_night: '밤',
  stage_egg: '알',
  stage_fresh: '유년기',
  stage_baby: '성장기',
  stage_child: '성숙기',
  stage_adult: '완전체',
  stage_perfect: '궁극체',
  stage_mega: '초궁극체',
  personality_calm: '온화',
  personality_gentle: '순함',
  personality_holy: '신성',
  personality_mischief: '장난',
  personality_savage: '거침',
  minutes: '분',
  seconds: '초',
  on: '켜짐',
  off: '꺼짐',
  confirmAbort: '집중을 중단할까요? XP는 적립되지 않습니다.',
  confirmReset: '펫을 리셋할까요? 현재 펫은 묘비로 이동됩니다.',
  cancel: '취소',
  confirmYes: '확인',
  graveyardTitle: '묘지',
  graveyardEmpty: '아직 잠든 펫이 없습니다.',
  graveyardLifespan: '생존',
  graveyardEvoCount: '진화',
  graveyardForks: '포크',
  graveyardRipCause: 'R.I.P.',
  graveyardReset: '리셋',
  nextEvolution: '다음 진화까지',
  daysUntilRip: 'R.I.P.까지',
  ripStageMax: '최종 단계',
  ripStageMaxValue: '더 이상 진화 없음',
}

const BUNDLES: Record<Lang, Bundle> = { en: EN, ko: KO }

export function t(key: string, lang: Lang = 'en', params?: Record<string, string | number>): string {
  const bundle = BUNDLES[lang] ?? BUNDLES.en
  let s = bundle[key] ?? EN[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return s
}

export function isLang(v: unknown): v is Lang {
  return v === 'ko' || v === 'en'
}
