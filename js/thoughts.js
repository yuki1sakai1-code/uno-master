/**
 * プレイヤーA・B・Cの思考・吹き出し演出モジュール
 */

const THOUGHTS = {
  1: { // プレイヤーA (熱血・アグレッシブ)
    start: [
      '一番乗りで上がってやるぜ！🔥',
      '気合い入れていくぞ！',
      '最初から全力勝負だ！'
    ],
    turn_normal: [
      'よし、攻めるぜ！',
      '流れはこっちにある！',
      'このカードで勝負だ！',
      'どんどん手札を減らすぜ！',
      'よし、見切った！'
    ],
    turn_few_cards: [
      'あと少し…！勝負だ！⚡',
      'UNOが見えてきたぜ！',
      'このまま逃げ切ってやる！'
    ],
    turn_many_cards: [
      'くっ、手札が重いぜ…💦',
      'ここから巻き返してやる！',
      '焦るな、まだチャンスはある！'
    ],
    play_wild4: [
      '喰らえ！ドロー4だ！🔥',
      '悪いな、容赦しねぇぜ！',
      'これで一気に逆転だ！'
    ],
    play_wild: [
      '俺の得意な色に変えるぜ！',
      'この色ならどうだ！？'
    ],
    play_draw2: [
      '2枚引いてもらうぜ！⚡',
      'これでも喰らいな！'
    ],
    play_skip: [
      '悪いな、お前はパスだ！',
      'お前の手番は飛ばすぜ！'
    ],
    play_reverse: [
      '逆回転だ！戻れ！',
      '流れをひっくり返すぜ！'
    ],
    uno: [
      'UNO！次で終わりだ！🔥',
      'リーチ！俺の勝ちだ！'
    ],
    draw_frustrated: [
      'くそっ、出せる札がない…',
      '引くしかないか…！',
      '頼む、いいカード来い！'
    ],
    draw_attacked: [
      'うわっ、引かせるなよ！💦',
      'マジかよ、まとめて喰らった！'
    ],
    watch_uno: [
      'おいおい、もうUNOかよ！？',
      'あいつの手札、止めねぇと！'
    ],
    human_thinking: [
      'じっくり考えてるな…',
      '何を出してくるんだ？',
      '赤だけは勘弁してくれよ！'
    ],
    win: [
      'よっしゃーー！完全勝利だ！🏆',
      '俺の勝ちだ！最高の勝負だったぜ！'
    ],
    lose: [
      'くそっ、負けたか…！悔しいぜ！',
      '次は絶対に勝つからな！'
    ]
  },
  2: { // プレイヤーB (冷静・ベテラン策士)
    start: [
      'ふむ、いい勝負を期待しているよ。',
      '手堅く盤面を読むとしよう。',
      '焦らず、確実にいくさ。'
    ],
    turn_normal: [
      'ふむ、手堅く一手進めるか。',
      '盤面をコントロールしよう。',
      'この色で揺さぶりをかけるか。',
      '静かに好機を待つ。'
    ],
    turn_few_cards: [
      '仕掛けどころだな。',
      '勝機が見えてきた。',
      'このまま終局へと導こう。'
    ],
    turn_many_cards: [
      '手札の整理が必要だな…',
      '焦りは禁物だ。',
      '一手ずつ確実に減らしていくか。'
    ],
    play_wild4: [
      'ここは強硬手段に出る。',
      '4枚、受け取ってもらおう。',
      '勝負所を見誤るなよ。'
    ],
    play_wild: [
      '流れの色を変えよう。',
      'この色に指定させてもらう。'
    ],
    play_draw2: [
      '2枚、引いてもらおう。',
      '手札を補充しておきなさい。'
    ],
    play_skip: [
      '手番を飛ばさせてもらう。',
      '少し休んでいなさい。'
    ],
    play_reverse: [
      '流れを反転させよう。',
      '思惑通りにはさせんよ。'
    ],
    uno: [
      'UNO。これで詰みだな。',
      '残り1枚。終局だ。'
    ],
    draw_frustrated: [
      'ここは1枚引いて様子見か。',
      '札が噛み合わんな…',
      '焦らず山札を引くとするか。'
    ],
    draw_attacked: [
      'ほう、やってくれたな…',
      'いい攻め手だが、まだ終わらんよ。'
    ],
    watch_uno: [
      'リーチか…警戒せねばな。',
      '次の一手、見極めが必要だ。'
    ],
    human_thinking: [
      '長考か…何を狙っている？',
      '慎重な指し手だな。',
      '緑なら受けて立つが。'
    ],
    win: [
      'チェックメイトだな。見事な勝負だった。',
      '計算通りの結末だ。礼を言うよ。'
    ],
    lose: [
      'お見事。完敗だな…次の一手を練り直すか。',
      '見事な試合運びだったよ。'
    ]
  },
  3: { // プレイヤーC (スマート・計算＆お茶目)
    start: [
      'ふふ、よろしくね〜！✨',
      'みんな強そう！負けないよ〜♪',
      '楽しく勝っちゃお〜っと！'
    ],
    turn_normal: [
      '計算通りね♪',
      '次はどこへ回そうかな？',
      'ふふ、いいカード揃ってるわよ。',
      'リズムよくいこ〜！'
    ],
    turn_few_cards: [
      'もうすぐ上がれちゃうかも！✨',
      'UNOの準備、バッチリ！',
      '勝っちゃったらごめんね♪'
    ],
    turn_many_cards: [
      'あちゃ〜、手札がいっぱい…💦',
      '早く減らさなきゃ！',
      'どれから出すか悩むな〜'
    ],
    play_wild4: [
      'ごめんね〜！ドロー4だよ♪😈',
      '4枚プレゼント〜！',
      'ここは容赦なくいっちゃう！'
    ],
    play_wild: [
      '私の好きな色に変えちゃお〜！',
      'この色で勝負よ！'
    ],
    play_draw2: [
      'ドロー2！もらってね〜⚡',
      '2枚引いちゃって！'
    ],
    play_skip: [
      'ちょっとストップね！',
      'スキップしちゃいま〜す♪'
    ],
    play_reverse: [
      'くるっと反転〜！戻れ〜！',
      'はい、逆回転だよ！'
    ],
    uno: [
      'UNO！あと1枚だよ〜！🎉',
      'リーチ！勝っちゃうよ〜！'
    ],
    draw_frustrated: [
      '出せるのないや…引くね〜',
      'いいカード来て〜！',
      'うーん、噛み合わないなぁ…'
    ],
    draw_attacked: [
      'ひど〜い！手札増えちゃった💦',
      'もう！狙い撃ちしないでよ〜！'
    ],
    watch_uno: [
      'えっ！もうUNOなの！？',
      'ピンチ！誰か止めて〜！'
    ],
    human_thinking: [
      '何出そうか迷ってるのかな？',
      '青にしてくれたら嬉しいな〜♪',
      'じ〜っ…（観察中）'
    ],
    win: [
      'やった〜！私の勝ち〜！🎉✨',
      'えへへ、勝っちゃった！楽しかった〜！'
    ],
    lose: [
      'あ〜ん、惜しかった〜！次は負けないからね！',
      'つ、強い…！もう一回勝負して！'
    ]
  }
};

const timers = {};

function pickRandom(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 思考吹き出しの表示 (単一排他制御: 同時に複数の吹き出しが重なるのを防止)
 */
export function showThought(playerIndex, text, duration = 2300) {
  if (playerIndex < 1 || playerIndex > 3) return;

  // 他のプレイヤーの吹き出しを即時非表示（モバイル等での画面の重なり・文字重複を100%防止）
  for (let i = 1; i <= 3; i++) {
    if (i !== playerIndex) {
      const otherBubble = document.getElementById(`thought-${i}`);
      if (otherBubble) otherBubble.classList.remove('show');
      if (timers[i]) {
        clearTimeout(timers[i]);
        timers[i] = null;
      }
    }
  }

  const bubble = document.getElementById(`thought-${playerIndex}`);
  if (!bubble) return;

  const textEl = bubble.querySelector('.thought-text');
  if (textEl) {
    textEl.textContent = text;
  }

  // アニメーション再トリガー
  bubble.classList.remove('show');
  void bubble.offsetWidth; // reflow
  bubble.classList.add('show');

  if (timers[playerIndex]) {
    clearTimeout(timers[playerIndex]);
  }

  timers[playerIndex] = setTimeout(() => {
    bubble.classList.remove('show');
    timers[playerIndex] = null;
  }, duration);
}

export function hideAllThoughts() {
  for (let i = 1; i <= 3; i++) {
    const bubble = document.getElementById(`thought-${i}`);
    if (bubble) bubble.classList.remove('show');
    if (timers[i]) {
      clearTimeout(timers[i]);
      timers[i] = null;
    }
  }
}

/**
 * AIのターン開始時の思考決定
 * - 特殊カード・攻撃被弾時・手札ピンチ時: 100%発言（メリハリのあるリアクション）
 * - 平常の数字カード出し時: 毎ターン喋るとうるさいため約25%の確率でのみつぶやく
 */
export function triggerAiTurnThought(game, idx) {
  if (idx < 1 || idx > 3) return;

  const pThoughts = THOUGHTS[idx];
  const hand = game.players[idx];

  // 1. 攻撃を受けてドローしなければいけない場合 (100%発言)
  if (game.pendingDraw > 0) {
    showThought(idx, pickRandom(pThoughts.draw_attacked), 2200);
    return;
  }

  const valid = game.getValidPlays(idx);

  // 2. 出せるカードがない場合 (100%発言)
  if (valid.length === 0) {
    showThought(idx, pickRandom(pThoughts.draw_frustrated), 2200);
    return;
  }

  // 3. 次に何を出す予定かによって思考を分岐
  const nextCard = game.pickAiCard(valid, hand);
  if (!nextCard) return;

  if (hand.length === 2) {
    // 次でUNOになる (100%発言)
    showThought(idx, pickRandom(pThoughts.turn_few_cards), 2400);
  } else if (nextCard.value === 'wild4') {
    showThought(idx, pickRandom(pThoughts.play_wild4), 2400);
  } else if (nextCard.value === 'wild') {
    showThought(idx, pickRandom(pThoughts.play_wild), 2300);
  } else if (nextCard.value === 'draw2') {
    showThought(idx, pickRandom(pThoughts.play_draw2), 2300);
  } else if (nextCard.value === 'skip') {
    showThought(idx, pickRandom(pThoughts.play_skip), 2200);
  } else if (nextCard.value === 'reverse') {
    showThought(idx, pickRandom(pThoughts.play_reverse), 2200);
  } else if (hand.length >= 8) {
    // 手札過多ピンチ時 (70%発言)
    if (Math.random() < 0.7) {
      showThought(idx, pickRandom(pThoughts.turn_many_cards), 2200);
    }
  } else {
    // 平常時（通常数字カード出し）: 毎ターン出しゃばりすぎないよう約25%の確率でのみつぶやく
    if (Math.random() < 0.25) {
      showThought(idx, pickRandom(pThoughts.turn_normal), 2000);
    }
  }
}

/**
 * ゲーム開始時の挨拶 (重ならないよう1人ずつ順次発言)
 */
export function triggerGameStartThoughts() {
  hideAllThoughts();
  setTimeout(() => showThought(1, pickRandom(THOUGHTS[1].start), 1900), 400);
  setTimeout(() => showThought(2, pickRandom(THOUGHTS[2].start), 1900), 2500);
  setTimeout(() => showThought(3, pickRandom(THOUGHTS[3].start), 1900), 4600);
}

/**
 * 誰かがUNO（残り1枚）になったときのリアクション (順番リレーで重なり防止)
 */
export function triggerUnoReaction(unoPlayerIndex) {
  // まずUNOを言った本人が発言 (2.3秒)
  if (unoPlayerIndex >= 1 && unoPlayerIndex <= 3) {
    showThought(unoPlayerIndex, pickRandom(THOUGHTS[unoPlayerIndex].uno), 2300);
  }

  // 2.4秒後、他プレイヤーの誰か1名が代表して驚きリアクション (2.3秒)
  const opponents = [1, 2, 3].filter(i => i !== unoPlayerIndex);
  if (opponents.length > 0) {
    const reactor = opponents[Math.floor(Math.random() * opponents.length)];
    setTimeout(() => {
      showThought(reactor, pickRandom(THOUGHTS[reactor].watch_uno), 2300);
    }, 2400);
  }
}

/**
 * ゲーム終了時のリアクション (勝者→敗者代表の順次発言)
 */
export function triggerGameOverThoughts(winnerIndex) {
  if (winnerIndex >= 1 && winnerIndex <= 3) {
    // 勝利したAIプレイヤーの発言演出
    const victoryQuote = winnerIndex === 3 ? '私の勝ちね' : '俺の勝ちだ。';
    setTimeout(() => showThought(winnerIndex, victoryQuote, 2700), 200);
  } else {
    // 人間勝者時: AIの1人が敗北コメント (0.5s 〜 3.0s)
    const loser = Math.floor(Math.random() * 3) + 1;
    setTimeout(() => showThought(loser, pickRandom(THOUGHTS[loser].lose), 2500), 500);
  }
}

/**
 * プレイヤー（あなた）が長考している時のランダム思考
 */
export function triggerHumanThinkingThought() {
  const randomAi = Math.floor(Math.random() * 3) + 1;
  showThought(randomAi, pickRandom(THOUGHTS[randomAi].human_thinking), 2300);
}
