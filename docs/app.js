(() => {
  'use strict';
  const D = window.FHRData;
  const main = document.getElementById('main');
  const dialog = document.getElementById('action-dialog');
  const labels = {intro:'この資料について',overview:'経営概況',stores:'店舗の課題',actions:'改善アクション',impact:'効果を考える',rollout:'導入プラン'};
  const state = {view:'intro',store:'B',metric:'revenue',task:null,people:10,fee:180,tour:false,step:0};
  const tourSteps = [
    {view:'intro',title:'この仕組みが、自社の経営に役立ちそうか',note:'店舗の状況確認から担当・期限の設定まで、実際の画面で確かめます。まず1〜2店舗で試すなら、どの業務から始めるかをご検討ください。'},
    {view:'overview',title:'全店舗の状況を、ひと目でつかむ',note:'売上は伸びています。では、全店舗が同じように順調なのでしょうか。'},
    {view:'stores',title:'店舗Bの課題を、数字で確かめる',note:'退会率は2.0%から3.0%へ。未対応12件との関連は、店舗に確認します。'},
    {view:'actions',title:'提案を、担当と期限のある行動にする',note:'「担当・期限を決める」を押して、デモ内のアクションに追加してください。'},
    {view:'impact',title:'実行と成果を分けて、効果を測る',note:'対応の完了率と退会率を追います。売上への影響は仮定を変えて試算できます。'},
    {view:'rollout',title:'小さく試して、導入を判断する',note:'最初は1〜2店舗。データの利用条件と効果を確認してから拡大します。'}
  ];
  const number = n => new Intl.NumberFormat('ja-JP',{maximumFractionDigits:0}).format(n);
  const pct = n => n.toFixed(1);
  const signed = n => `${n>=0?'+':''}${pct(n)}`;
  const rm = n => `RM ${number(n)}`;
  let chartObserver;
  let toastTimer;
  function intro(kicker,title,subtitle) {
    return `<div class="page-intro"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p class="intro-note">${subtitle}</p></div><div class="period">REPORTING PERIOD<strong>2026.09</strong>月次確定値 · デモ</div></div>`;
  }
  function introduction() {
    return `<section class="welcome-page">
      <div class="welcome-hero">
        <div class="welcome-copy">
          <span class="eyebrow">この資料について</span>
          <h1>店舗の状況をまとめて見て、<br>次に何をするかを決める。</h1>
          <p class="welcome-lead">複数の店舗を管理する仕組みのご提案です。<br>実際の画面を操作しながら、日々の経営に役立つかを確認できます。</p>
          <div class="welcome-buttons"><button class="button primary" type="button" data-go="overview">デモを見る →</button><button class="button" type="button" data-start-tour>説明に沿って見る</button></div>
          <p class="welcome-sample">店舗名・数字・AIのコメントは説明用の例です。<br>実際の顧客情報や外部サービスには接続していません。</p>
        </div>
        <aside class="welcome-decision">
          <span class="eyebrow">今回、ご検討いただきたいこと</span>
          <h2>この仕組みが、<br>自社の経営に役立ちそうか。</h2>
          <p>まず1〜2店舗で試すなら、どの業務から始めるか。デモを見ながら一緒に考えるための資料です。</p>
          <div class="welcome-decision-note">いま使っている会員管理・決済・入退館の仕組みを活かす案です。連携できる情報は、導入前に確認します。</div>
        </aside>
      </div>
      <section class="welcome-purpose" aria-labelledby="welcome-purpose-title">
        <div class="section-heading"><h2 id="welcome-purpose-title">日々の「知りたい」を、一つの画面に。</h2><span>このデモで体験する3つのこと</span></div>
        <ol class="welcome-flow">
          <li><span class="welcome-step">01</span><p class="welcome-question">どの店舗が順調？</p><h3>全店舗の状況を見る</h3><p>売上・利益・会員数をまとめて、店舗ごとに比較できます。</p></li>
          <li><span class="welcome-step">02</span><p class="welcome-question">どこを確認すればいい？</p><h3>気になる店舗を確認する</h3><p>退会の増加や、まだ対応できていない件数を詳しく見られます。</p></li>
          <li><span class="welcome-step">03</span><p class="welcome-question">次に、誰が動く？</p><h3>担当と期限を決める</h3><p>誰が、いつまでに対応するかを決め、その後の進み具合を確認できます。</p></li>
        </ol>
      </section>
      <div class="welcome-bottom"><p>続く画面では、条件を変えた売上の計算と、少数の店舗から試す進め方もご覧いただけます。</p><button class="text-button" type="button" data-go="overview">経営の画面へ進む →</button></div>
    </section>`;
  }
  function metrics(id='all') {
    const s=D.summary(id);
    return `<div class="metrics"><div class="metric"><div class="metric-label">売上</div><div class="metric-value"><span class="unit-prefix">RM</span>${number(s.revenue)}</div><div class="metric-foot"><span class="${s.revenueChangePercent>=0?'positive':'negative'}">${signed(s.revenueChangePercent)}%</span><span>前月比</span></div></div><div class="metric"><div class="metric-label">営業利益（簡易）</div><div class="metric-value"><span class="unit-prefix">RM</span>${number(s.profit)}</div><div class="metric-foot"><span class="${s.profitChangePercent>=0?'positive':'negative'}">${signed(s.profitChangePercent)}%</span><span>売上 − 費用</span></div></div><div class="metric"><div class="metric-label">月末会員数</div><div class="metric-value">${number(s.members)}<small>人</small></div><div class="metric-foot"><span class="positive">純増 +${s.netGrowth}人</span><span>入会 ${s.joins} / 退会 ${s.leaves}</span></div></div><div class="metric"><div class="metric-label">月間退会率</div><div class="metric-value">${pct(s.churnPercent)}<small>%</small></div><div class="metric-foot"><span class="${s.churnPercent>s.previousChurnPercent?'negative':'neutral'}">${signed(s.churnPercent-s.previousChurnPercent)}pt</span><span>月初会員数基準</span></div></div></div>`;
  }
  function storeCards() {
    return `<div class="section-heading"><h3>店舗別のハイライト</h3><span>店舗を選んで詳細を確認</span></div><div class="store-grid">${D.stores.map(store=>{
      const s=D.summary(store.id);
      return `<button type="button" class="store-card" data-store="${store.id}" aria-label="${store.name}の詳細を見る"><div class="store-card-head"><strong>${store.name}</strong><span class="badge ${store.id==='B'?'warning':''}">${store.id==='B'?'優先確認':'モデル店舗'}</span></div><div class="store-card-metrics"><div>営業利益<strong>${rm(s.profit)}</strong></div><div>退会率<strong>${pct(s.churnPercent)}%</strong></div><div>会員数<strong>${s.members}人</strong></div></div><div class="store-card-footer"><span>利益前月比 <span class="${s.profitChangePercent>=0?'positive':'negative'}">${signed(s.profitChangePercent)}%</span></span><span aria-hidden="true">詳細 →</span></div></button>`;
    }).join('')}</div>`;
  }
  function overview() {
    return intro('EXECUTIVE BRIEF / FHR GROUP','今月、手を打つべきこと。','全店舗の状況から、確認が必要な店舗と次のアクションへ。') + metrics() +
      `<div class="main-grid"><section class="panel"><div class="panel-head"><div><h3>全店舗の業績推移</h3><p>2026年4月 — 9月 / 架空の月次実績</p></div><div class="segmented" aria-label="表示する指標"><button type="button" data-metric="revenue" aria-pressed="${state.metric==='revenue'}">売上</button><button type="button" data-metric="profit" aria-pressed="${state.metric==='profit'}">営業利益</button></div></div><div id="trend-chart" class="trend" role="img" aria-label="6か月の業績推移"></div><p class="chart-summary">9月：売上 ${rm(625000)} − 費用 ${rm(494000)} = 営業利益 ${rm(131000)}</p></section><section class="panel focus-panel"><span class="eyebrow">THIS MONTH'S FOCUS</span><span class="badge warning">優先して確認</span><h2>店舗Bの退会増加。<br>未対応フォローから確認。</h2><p>退会率の上昇と未対応案件が見られます。<br>まず店舗責任者へ状況確認を。</p><div class="focus-evidence"><div>退会率<strong>3.0<small>%</small></strong></div><div>未対応フォロー<strong>12<small>件</small></strong></div></div><button type="button" class="button primary" data-store="B">店舗Bの根拠を見る <span aria-hidden="true">→</span></button></section></div>` + storeCards();
  }
  function stores() {
    const id=state.store;
    const store=D.stores.find(x=>x.id===id);
    const s=D.summary(id);
    const isB=id==='B';
    return intro('STORE INSIGHT',`${store.name}の変化を、数字で確認。`,'AIの提案は、根拠を確認してから。変化の原因は店舗への確認が必要です。') +
      `<div class="store-selector" aria-label="店舗を選択">${D.stores.map(x=>`<button type="button" data-select-store="${x.id}" aria-pressed="${x.id===id}">${x.name}</button>`).join('')}</div>` + metrics(id) +
      `<div class="analysis-grid"><section class="panel"><div class="panel-head"><h3>退会率の変化</h3><span class="badge ${isB?'warning':''}">${isB?'前月比 +1.0pt':'前月と同水準'}</span></div><div class="comparison"><div class="comparison-cell"><span>8月</span><strong>${pct(s.previousChurnPercent)}<small>%</small></strong><p>退会 ${store.previousLeaves}人 / 月初 ${store.previousOpening}人</p></div><span aria-hidden="true">→</span><div class="comparison-cell ${isB?'current':''}"><span>9月</span><strong>${pct(s.churnPercent)}<small>%</small></strong><p>退会 ${s.leaves}人 / 月初 ${s.opening}人</p></div></div><p class="formula">退会率 = 月間退会者数 ÷ 月初会員数 × 100</p></section><section class="panel"><div class="panel-head"><h3>店舗に確認する数字</h3><span class="badge">9月末時点</span></div><ul class="evidence-list"><li><span>フォロー対象</span><strong>${s.followupsTotal}<small> 件</small></strong></li><li><span>対応完了</span><strong>${s.followupsCompleted}<small> 件</small></strong></li><li><span>未対応</span><strong class="${isB?'negative':''}">${s.pending}<small> 件</small></strong></li><li><span>対応完了率</span><strong>${pct(s.completionPercent)}<small> %</small></strong></li></ul></section></div><section class="ai-panel"><span class="ai-mark">AI</span><div class="ai-content"><h3>AI提案の表示例</h3><p>${isB?'退会率が前月より1.0ポイント上昇し、12件のフォローが未対応です。まず未対応案件の内容と担当状況を、店舗責任者が確認することを提案します。':`退会率は前月と同水準です。未対応${s.pending}件の状況を確認し、通常のフォローを継続することを提案します。`}</p><small>事前に用意した提案例です。未対応と退会の因果関係は未確認で、AIによる予測・自動判断ではありません。</small>${isB?'<button type="button" class="button primary" data-go="actions">改善アクションを確認 →</button>':'<button type="button" class="button" data-select-store="B">優先確認の店舗Bを見る →</button>'}</div></section><details class="source-details"><summary>数値の出所・集計範囲</summary><p>すべて架空データ。売上・費用は月次集計、会員数は月初＋入会−退会、フォローは対象案件数から集計しています。実際の導入では、利用許可のあるデータのみを連携し、対象期間・更新日時・集計ルールを表示します。</p></details>`;
  }
  function actions() {
    const task=state.task;
    return intro('FROM INSIGHT TO ACTION','気づきを、実行につなげる。','誰が・いつまでに・何をするかを明確にし、本部と店舗で共有。') +
      `<div class="action-layout"><section class="panel"><div class="panel-head"><span class="badge warning">店舗B · フォロー改善</span><span class="badge ${task?'green':''}">${task?'デモ内で担当設定済み':'対応案'}</span></div><h2 class="action-title">未対応12件の状況を確認し、<br>次のフォローを決める。</h2><p class="action-intro">個々の会員への連絡や支援は、店舗スタッフが内容を確認して実施します。</p><dl class="action-meta"><div><dt>担当責任者</dt><dd>${task?task.owner:'未設定'}</dd></div><div><dt>確認期限</dt><dd>${task?task.due.replaceAll('-',' / '):'未設定'}</dd></div><div><dt>対象</dt><dd>店舗Bの未対応フォロー12件</dd></div><div><dt>後日の確認指標</dt><dd>対応完了率・退会率</dd></div></dl><ol class="steps"><li><strong>未対応の理由を確認</strong><small>担当・対応履歴・連絡の可否を店舗で確認。</small></li><li><strong>必要なフォローを実施</strong><small>本人の状況に合った支援を、スタッフが判断。</small></li><li><strong>実施結果を記録</strong><small>対応状況を共有し、翌月の変化を比較。</small></li></ol>${task?`<div class="status-line"><label class="field" style="margin:0">デモ内のタスク進捗<select id="task-status"><option${task.status==='未着手'?' selected':''}>未着手</option><option${task.status==='対応中'?' selected':''}>対応中</option><option${task.status==='完了'?' selected':''}>完了</option></select></label><button type="button" class="button" data-open-action>担当・期限を変更</button></div>`:'<button type="button" class="button primary" data-open-action>担当・期限を決める →</button>'}<p class="sim-note">この操作で顧客への連絡や実データの更新は行われません。タスク完了によって業績数値が変化する演出も行いません。</p></section><aside class="panel side-note"><span class="eyebrow">MANAGEMENT LOOP</span><h3>提案から、結果の確認まで。</h3><p>経営者は、各店舗への個別確認を繰り返す代わりに、担当と進捗をまとめて確認できます。</p><ul class="evidence-list"><li><span>気づき</span><span>退会率の変化</span></li><li><span>判断</span><span>店舗に確認</span></li><li><span>実行</span><span>担当・期限を設定</span></li><li><span>評価</span><span>実施状況と業績を比較</span></li></ul><button type="button" class="button full-width" style="margin-top:22px" data-go="impact">効果の見方へ →</button></aside></div>`;
  }
  function impact() {
    return intro('MEASURE THE VALUE','導入効果を、確かめながら。','対応が進んだか、業務負担が減ったか、業績がどう変わったかを分けて評価します。') +
      `<div class="impact-grid"><section class="panel"><div class="panel-head"><div><h3>継続支援の売上シミュレーション</h3><p>追加で1か月継続する人数と会費を仮定</p></div><span class="badge">仮定による試算</span></div><label class="field"><span class="field-top"><span>追加で継続する人数</span><strong id="people-value">${state.people}<small> 人</small></strong></span><input id="sim-people" type="range" min="0" max="30" step="1" value="${state.people}"></label><label class="field"><span class="field-top"><span>1人あたり月会費（RM）</span></span><input id="sim-fee" type="number" min="0" max="1000" step="1" value="${state.fee}" inputmode="numeric" required></label><div class="sim-result" aria-live="polite"><span>1か月分の追加会費売上</span><strong><small>RM</small><b id="sim-value" style="font-weight:500">${number(state.people*state.fee)}</b></strong><p id="sim-formula">${state.people}人 × RM ${number(state.fee)} / 月</p></div><p class="sim-note">改善を保証する予測ではありません。割引・返金・追加費用等を含まない会費売上の単純計算で、利益額ではありません。</p></section><section class="panel"><div class="panel-head"><h3>試験導入で測ること</h3><span class="badge">店舗Bの基準値</span></div><div class="measure-row"><h3>対応が進んだか</h3><div class="measure-values"><strong>60.0%</strong><span>9月の対応完了率 → 導入後と比較</span></div><p>18件完了 / 対象30件。担当設定だけで改善済みと判定しません。</p></div><div class="measure-row"><h3>会員の継続に変化があったか</h3><div class="measure-values"><strong>3.0%</strong><span>9月の退会率 → 同じ定義で追跡</span></div><p>季節性やキャンペーンも確認し、AI単独の効果と断定しません。</p></div><div class="measure-row"><h3>報告・確認の負担が減ったか</h3><div class="measure-values"><strong>導入前に計測</strong></div><p>店舗の入力時間と本部の集計時間を、導入前後で記録します。</p></div><button type="button" class="button full-width" style="margin-top:16px" data-go="rollout">試験導入の進め方 →</button></section></div>`;
  }
  function rollout() {
    return intro('START SMALL, VERIFY, EXPAND','まず1〜2店舗で、価値を確認。','既存システムを活かし、使えるデータと現場の負担を確認しながら導入します。') +
      `<div class="phase-grid"><section class="phase"><span class="phase-day">01 / DAY 1–30</span><h2>確認と設計</h2><p>既存サービスの機能・利用権限を確認。集計指標、店舗別の閲覧範囲、運用責任者を決めます。</p><div class="phase-goal">判断：使えるデータと試す範囲</div></section><section class="phase"><span class="phase-day">02 / DAY 31–60</span><h2>1〜2店舗で試す</h2><p>経営概況と対応管理から開始。実際に使うスタッフが入力負担と数字の正しさを確認します。</p><div class="phase-goal">判断：現場で運用できるか</div></section><section class="phase"><span class="phase-day">03 / DAY 61–90</span><h2>評価して拡大</h2><p>対応率・報告時間・業績の変化を比較。改善点と費用を整理し、次の店舗への展開を判断します。</p><div class="phase-goal">判断：継続・改善・拡大</div></section></div><section class="panel"><div class="panel-head"><div><h3>既存の仕組みと、つなぐ構成</h3><p>本番で実装する設計案 · 連携可否は未確認</p></div><span class="badge">このデモは未接続</span></div><div class="system-flow"><div class="system-node"><strong>既存の会員管理</strong><small>契約・決済・入退館を継続</small></div><span class="system-arrow" aria-hidden="true">→</span><div class="system-node"><strong>許可されたデータを集計</strong><small>サーバー・DB・権限管理</small></div><span class="system-arrow" aria-hidden="true">→</span><div class="system-node"><strong>経営者・店舗のコンソール</strong><small>状況確認・対応管理・評価</small></div></div><div class="safe-grid"><div><strong>アクセスを限定</strong><p>個別アカウントと多要素認証。店舗・役割ごとの権限をサーバーで検証。</p></div><div><strong>開発と本番を分離</strong><p>顧客情報は許可された範囲で利用。検証用DB・接続キーを本番と分離。</p></div><div><strong>復旧まで備える</strong><p>操作記録とDB・ファイルのバックアップ。復元できることを確認。</p></div></div></section><div class="rollout-bottom"><div><h3>最初の意思決定は、試す店舗と責任者。</h3><p>対象店舗・責任者・評価指標・許可されるデータを決め、導入範囲を具体化します。</p></div><button type="button" class="button primary" data-go="overview">経営概況に戻る →</button></div><p class="sim-note">90日は進め方の例で、開発納期や効果の保証ではありません。AI提案は人が確認し、会員情報の外部送信条件は別途確認します。</p>`;
  }
  function drawChart() {
    const el=document.getElementById('trend-chart'); if(!el) return;
    const points=D.monthlySeries();
    const width=Math.max(240,el.clientWidth);
    const height=230;
    const left=45,right=12,top=27,bottom=38;
    const plotW=width-left-right,plotH=height-top-bottom;
    const values=points.map(p=>p[state.metric]);
    const max=Math.ceil(Math.max(...values)/100000)*100000;
    const step=plotW/points.length,bar=Math.min(43,step*.54);
    const y=v=>top+plotH-(v/max*plotH);
    let body='';
    for(let i=0;i<=3;i++) {
      const v=max*i/3,py=y(v);
      body+=`<line x1="${left}" y1="${py}" x2="${width-right}" y2="${py}" stroke="#e5eae3"/><text x="${left-9}" y="${py+4}" text-anchor="end" fill="#7c8880" font-size="10">${Math.round(v/10000)}</text>`;
    }
    points.forEach((p,i)=>{
      const x=left+step*(i+.5),v=p[state.metric],py=y(v),last=i===points.length-1;
      body+=`<rect x="${x-bar/2}" y="${py}" width="${bar}" height="${Math.max(1,top+plotH-py)}" rx="4" fill="${last?'#cf683d':'#b9c9bc'}"><title>${p.label} ${state.metric==='revenue'?'売上':'営業利益'} ${rm(v)}</title></rect><text x="${x}" y="${py-8}" text-anchor="middle" fill="${last?'#a44d27':'#4e6757'}" font-size="10">${(v/10000).toFixed(1)}</text><text x="${x}" y="${height-12}" text-anchor="middle" fill="#7c8880" font-size="11">${p.label}</text>`;
    });
    el.setAttribute('aria-label',`${state.metric==='revenue'?'売上':'営業利益'}推移。${points.map(p=>`${p.label} ${rm(p[state.metric])}`).join('、')}。全数値は架空。`);
    el.innerHTML=`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><text x="0" y="12" fill="#7c8880" font-size="10">RM 万</text>${body}</svg>`;
  }
  function updateTour() {
    document.getElementById('tour').hidden=!state.tour;
    document.body.classList.toggle('tour-active',state.tour);
    document.getElementById('tour-start').textContent=state.tour?'説明中':'説明に沿って見る ↗';
    if(!state.tour) return;
    const step=tourSteps[state.step];
    document.getElementById('tour-count').textContent=`${String(state.step+1).padStart(2,'0')} / ${String(tourSteps.length).padStart(2,'0')}`;
    document.getElementById('tour-title').textContent=step.title;
    document.getElementById('tour-note').textContent=step.note;
    if(state.view==='stores') {
      const s=D.summary(state.store);
      document.getElementById('tour-title').textContent=`店舗${state.store}の状況を、数字で確かめる`;
      document.getElementById('tour-note').textContent=`退会率 ${pct(s.previousChurnPercent)}% → ${pct(s.churnPercent)}%。未対応 ${s.pending}件。次に店舗Bの対応案を確認します。`;
    }
    document.getElementById('tour-prev').disabled=state.step===0;
    document.getElementById('tour-next').textContent=state.step===tourSteps.length-1?'説明を終了 ✓':'次へ →';
  }
  function render() {
    if(chartObserver) chartObserver.disconnect();
    main.innerHTML=({intro:introduction,overview,stores,actions,impact,rollout})[state.view]();
    document.getElementById('breadcrumb-current').textContent=labels[state.view];
    document.querySelectorAll('#navigation [data-view]').forEach(b=>{
      if(b.dataset.view===state.view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
    updateTour();
    const chart=document.getElementById('trend-chart');
    if(chart) {drawChart();chartObserver=new ResizeObserver(drawChart);chartObserver.observe(chart);}
  }
  function navigate(view,scroll=true) {
    if(!Object.hasOwn(labels,view))return;
    state.view=view;
    if(state.tour)state.step=tourSteps.findIndex(s=>s.view===view);
    history.replaceState(null,'',`#${view}`);
    render();
    if(scroll)window.scrollTo({top:0,behavior:'instant'});
  }
  function notify(message) {
    const t=document.getElementById('toast');t.textContent=message;t.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.hidden=true;},4500);
  }
  function openAction() {
    const form=document.getElementById('action-form');
    form.elements.owner.value=state.task?state.task.owner:'店舗B 責任者';
    form.elements.due.value=state.task?state.task.due:'2026-10-21';
    dialog.showModal();
  }
  document.getElementById('navigation').addEventListener('click',e=>{
    const b=e.target.closest('[data-view]');if(b)navigate(b.dataset.view);
  });
  main.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.go)navigate(b.dataset.go);
    else if(b.hasAttribute('data-start-tour'))startTour();
    else if(b.dataset.store){state.store=b.dataset.store;navigate('stores');}
    else if(b.dataset.selectStore){state.store=b.dataset.selectStore;render();}
    else if(b.dataset.metric){state.metric=b.dataset.metric;render();}
    else if(b.hasAttribute('data-open-action'))openAction();
  });
  main.addEventListener('input',e=>{
    if(e.target.id!=='sim-people'&&e.target.id!=='sim-fee')return;
    const people=document.getElementById('sim-people'),fee=document.getElementById('sim-fee');
    if(!fee.validity.valid || fee.value==='') {
      document.getElementById('sim-value').textContent='—';
      document.getElementById('sim-formula').textContent='月会費は0〜1,000 RMの整数で入力してください。';
      return;
    }
    state.people=Number(people.value);state.fee=Number(fee.value);
    const result=D.simulate(state.people,state.fee);
    document.getElementById('people-value').textContent=`${result.people} 人`;
    document.getElementById('sim-value').textContent=number(result.monthlyRevenue);
    document.getElementById('sim-formula').textContent=`${result.people}人 × RM ${number(result.fee)} / 月`;
  });
  main.addEventListener('change',e=>{
    if(e.target.id==='task-status'&&state.task&&['未着手','対応中','完了'].includes(e.target.value)){
      state.task.status=e.target.value;notify(`デモ内のタスクを「${state.task.status}」にしました。業績数値は変わりません。`);
    }
  });
  document.getElementById('action-form').addEventListener('submit',e=>{
    e.preventDefault();
    const form=e.target;
    if(!form.reportValidity())return;
    const owner=form.elements.owner.value,due=form.elements.due.value;
    if(!['店舗B 責任者','本部 運営担当'].includes(owner)||!/^2026-\d{2}-\d{2}$/.test(due))return;
    state.task={owner,due,status:state.task?state.task.status:'未着手'};
    dialog.close();render();notify('デモ内のアクションに追加しました。外部への通知はありません。');
  });
  document.getElementById('dialog-close').addEventListener('click',()=>dialog.close());
  function startTour() {
    state.tour=true;state.step=0;state.store='B';navigate(tourSteps[0].view);
  }
  document.getElementById('tour-start').addEventListener('click',startTour);
  function moveTour(delta) {
    const lastStep=tourSteps.length-1;
    if(delta>0&&state.step===lastStep){state.tour=false;updateTour();notify('説明を終了しました。各画面は引き続き自由に操作できます。');return;}
    state.step=Math.max(0,Math.min(lastStep,state.step+delta));
    if(tourSteps[state.step].view==='stores')state.store='B';
    navigate(tourSteps[state.step].view);
  }
  document.getElementById('tour-prev').addEventListener('click',()=>moveTour(-1));
  document.getElementById('tour-next').addEventListener('click',()=>moveTour(1));
  document.getElementById('tour-close').addEventListener('click',()=>{state.tour=false;updateTour();});
  document.getElementById('reset-demo').addEventListener('click',()=>{
    state.task=null;state.people=10;state.fee=180;state.metric='revenue';state.store='B';state.tour=false;state.step=0;
    navigate('intro');notify('デモを初期状態に戻しました。');
  });
  window.addEventListener('keydown',e=>{
    if(!state.tour||dialog.open||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))return;
    if(e.key==='ArrowRight'){e.preventDefault();moveTour(1);}
    if(e.key==='ArrowLeft'){e.preventDefault();moveTour(-1);}
  });
  window.addEventListener('hashchange',()=>{
    const view=location.hash.slice(1);if(Object.hasOwn(labels,view))navigate(view);
  });
  const initial=location.hash.slice(1);
  if(Object.hasOwn(labels,initial))state.view=initial;
  render();
})();
