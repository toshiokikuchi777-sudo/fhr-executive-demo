(() => {
  'use strict';
  const D = window.FHRData;
  const modelName = id => D.stores.find(store=>store.id===id).name;
  const main = document.getElementById('main');
  const dialog = document.getElementById('action-dialog');
  const labels = {intro:'この資料について',overview:'経営概況',stores:'店舗の課題',actions:'改善アクション',impact:'効果を考える',rollout:'導入プラン'};
  const state = {view:'intro',country:'all',store:'B',metric:'revenue',task:null,people:10,fee:180,tour:false,step:0};
  const tourSteps = [
    {view:'intro',title:'LAVICHE / AMZ GROUPの店舗管理を考える',note:'国内AF・VISPO24・マレーシアAFの3モデルで、一元管理とAIによる報告づくりを体験します。実店舗の数や業績を示す資料ではありません。'},
    {view:'overview',title:'全体から、国別、店舗モデル別へ',note:'フィットネス3モデルの架空実績を円換算で比較します。日本・マレーシアを切り替え、各モデルの詳細を確認できます。'},
    {view:'stores',title:`${modelName('B')}の課題を、数字で確かめる`,note:'架空の課題を使った説明例です。金額は現地通貨で表示し、退会率と未対応フォローから確認の手順を体験します。'},
    {view:'actions',title:'提案を、担当と期限のある行動にする',note:'「担当・期限を決める」を押して、デモ内のアクションに追加してください。'},
    {view:'impact',title:'実行と成果を分けて、効果を測る',note:'対応の完了率と退会率を追います。売上への影響は仮定を変えて試算できます。'},
    {view:'rollout',title:'小さく試して、導入を判断する',note:'最初は1〜2店舗。データの利用条件と効果を確認してから拡大します。'}
  ];
  const number = n => new Intl.NumberFormat('ja-JP',{maximumFractionDigits:0}).format(n);
  const pct = n => n.toFixed(1);
  const signed = n => `${n>=0?'+':''}${pct(n)}`;
  const currencySymbol = currency => ({JPY:'¥',MYR:'RM'})[currency];
  const money = (n,currency='JPY') => `${currencySymbol(currency)} ${number(n)}`;
  const countryName = id => D.countries.find(country=>country.id===id).name;
  const scopeName = () => state.country==='all'?'全店舗（モデル）':`${countryName(state.country)}のモデル`;
  const currencyNote = '円換算は説明用の固定レート：1 MYR = 30円。実勢レートではありません。全期間に同じレートを使用しています。';
  let chartObserver;
  let toastTimer;
  function intro(kicker,title,subtitle) {
    return `<div class="page-intro"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p class="intro-note">${subtitle}</p></div><div class="period">DEMO PERIOD<strong>2026.09</strong>架空の月次実績</div></div>`;
  }
  function introduction() {
    return `<section class="welcome-page">
      <div class="welcome-hero">
        <div class="welcome-copy">
          <span class="eyebrow">LAVICHE / AMZ GROUP · この資料について</span>
          <h1>国内外の店舗を、<br>ひとつの画面で。</h1>
          <p class="welcome-lead">国内ANYTIME FITNESS・VISPO24と、マレーシアANYTIME FITNESSの情報を、まとめて把握する構想です。<br>AIによる情報整理や報告づくりで、経営者と店舗スタッフが判断とお客様対応に時間を使える仕組みをご提案します。</p>
          <p class="welcome-detail-note">株式会社ラ・ヴィーチェの理念「人生100年時代をより豊かに。」に沿って、店舗を支える日々の管理業務から改善を考えます。</p>
          <div class="welcome-buttons"><button class="button primary" type="button" data-gooverview>デモを見る →</button><button class="button" type="button" data-start-tour>説明に沿って見る</button></div>
          <p class="welcome-sample">数値はフィットネス3モデルの架空実績です。会社全事業や実際の全店舗の合計ではありません。<br>実店舗の売上・退会・課題を示すものではなく、顧客情報やAIサービスには接続していません。</p>
        </div>
        <aside class="welcome-decision">
          <span class="eyebrow">今回、ご検討いただきたいこと</span>
          <h2>この仕組みが、<br>自社の経営に役立ちそうか。</h2>
          <p>まず1〜2店舗で試すなら、どの業務から始めるか。デモを見ながら一緒に考えるための資料です。</p>
          <div class="welcome-decision-note">いま使っている会員管理・決済・入退館の仕組みを活かす案です。連携できる情報は、導入前に確認します。</div>
        </aside>
      </div>
      <section class="unified-brief" aria-labelledby="unified-title">
        <span class="eyebrow">一元管理で、全体から詳細へ</span><h2 id="unified-title">経営者は全体を、担当者は必要な範囲を。</h2>
        <p>国・地域ごとの情報を行き来せず、売上・利益・会員の増減・対応状況をまとめて把握。気になる国・地域から店舗へ、詳しく確認できます。</p>
        <ol class="unified-steps"><li><strong>全店舗</strong><span>国・地域をまたいだ全体像を確認</span></li><li><strong>国・地域別</strong><span>円換算で状況を比較</span></li><li><strong>店舗別</strong><span>現地通貨と根拠を確認</span></li></ol>
        <p class="welcome-detail-note">本番では、共有が認められた経営情報を集計して表示する設計です。会員の個人情報は承認された環境で管理し、役割ごとの閲覧範囲を設定します。デモの閲覧権限は未実装です。</p>
      </section>
      <section class="welcome-section" aria-labelledby="business-scope-title">
        <div class="welcome-section-heading"><span class="eyebrow">今回のデモで扱う範囲</span><h2 id="business-scope-title">国内とマレーシアのフィットネス事業から。</h2><p>事業情報に沿って、次の3つを説明用モデルにしています。店舗名・件数・実績は実在の店舗を表していません。</p></div>
        <div class="results-grid"><div><h3>国内ANYTIME FITNESS</h3><p>株式会社ラ・ヴィーチェの国内事業。画面では「${modelName('A')}」として表示。</p></div><div><h3>VISPO24</h3><p>株式会社ラ・ヴィーチェが運営する事業。画面では「${modelName('C')}」として表示。</p></div><div><h3>マレーシアANYTIME FITNESS</h3><p>FHR ALLIANCE SDN BHD.による海外事業。画面では「${modelName('B')}」として表示。</p></div></div>
        <p class="welcome-detail-note">関連事業：株式会社フリーリー（マシンピラティス）、株式会社ヴィアーチェ（法人向け中古PCの買取・販売、データ消去）。このデモでは紹介のみで、数値集計の対象外です。</p>
      </section>
      <section class="welcome-section" aria-labelledby="managed-title">
        <div class="welcome-section-heading"><span class="eyebrow">何を管理する？</span><h2 id="managed-title">店舗の数字と、日々の対応をまとめます。</h2><p>数字を見るだけでなく、確認が必要な店舗と次の対応がわかるようにします。</p></div>
        <div class="management-list">
          <article class="management-row"><div class="management-topic"><h3>売上・利益・経費</h3><small>売上、費用、店舗ごとの利益</small></div><p class="management-benefit">店舗ごとの差を比べ、売上や経費を見直すきっかけに。</p><span class="badge">デモで確認</span></article>
          <article class="management-row"><div class="management-topic"><h3>会員の増減</h3><small>会員数、入会数、退会数</small></div><p class="management-benefit">退会が増えている店舗に気づき、必要なフォローを検討。</p><span class="badge">デモで確認</span></article>
          <article class="management-row"><div class="management-topic"><h3>スタッフの対応</h3><small>未対応の件数、担当者、期限、進み具合</small></div><p class="management-benefit">誰が、いつまでに動くかを共有し、対応漏れを防ぐ。</p><span class="badge">デモで確認</span></article>
          <article class="management-row"><div class="management-topic"><h3>集客・個別トレーニング</h3><small>見学予約、契約数、広告費など</small></div><p class="management-benefit">問い合わせから契約までを振り返り、集客や提案を改善。</p><span class="badge warning">導入時の追加案</span></article>
        </div>
        <p class="welcome-detail-note">現在のデモは店舗ごとの集計と対応管理の画面例です。会員の詳しい情報や、見学・広告などの連携範囲は導入前に確認します。</p>
      </section>
      <section class="welcome-ai" aria-labelledby="ai-value-title">
        <div class="welcome-section-heading"><span class="badge">本番導入時の活用案</span><span class="eyebrow">AIは何を手伝う？</span><h2 id="ai-value-title">AIで、確認と報告の手間を減らす。</h2><p>AIが確認の準備を手伝い、経営者や店舗責任者が内容を確かめて判断します。</p></div>
        <div class="ai-value-grid">
          <article class="ai-value-card"><span class="ai-value-number">01</span><h3>報告を短くまとめる</h3><p>店舗ごとの実績から、要点をまとめた週次報告の下書きを用意します。</p><strong class="ai-value-benefit">報告を書く手間を減らす</strong></article>
          <article class="ai-value-card"><span class="ai-value-number">02</span><h3>気になる変化を整理する</h3><p>集計結果をもとに、売上の低下や退会の増加など、確認する点と根拠の数字を整理します。</p><strong class="ai-value-benefit">確認する順番を決めやすくする</strong></article>
          <article class="ai-value-card"><span class="ai-value-number">03</span><h3>次の対応案をつくる</h3><p>店舗に確認する内容や改善案、スタッフへ共有する文章の下書きを用意します。</p><strong class="ai-value-benefit">ゼロから考える負担を減らす</strong></article>
        </div>
        <div class="ai-report-example"><div class="ai-report-label">たとえば、モデルの数字をこんな報告に<span class="badge">事前に用意した表示例</span></div><blockquote>架空の${modelName('B')}では、退会率が前月の2.0%から3.0%に上昇しています。未対応フォロー12件の状況を、担当責任者に確認しましょう。</blockquote><button class="text-button" type="button" data-store="B">モデルの根拠をデモで見る →</button></div>
        <p class="welcome-detail-note">数字の集計・計算はシステムで行い、AIは結果の説明や下書きを支援する想定です。提案の採用や会員への連絡は、人が確認して決めます。</p>
      </section>
      <section class="welcome-section" aria-labelledby="workflow-title">
        <div class="welcome-section-heading"><h2 id="workflow-title">情報を集める時間から、判断する時間へ。</h2></div>
        <div class="work-comparison">
          <div class="work-before"><span class="work-label">導入前によくある作業</span><ol class="work-steps"><li>資料を各店舗から集める</li><li>数字を読み比べる</li><li>報告を書く</li><li>対応を決める</li></ol></div>
          <div class="work-after"><span class="work-label">導入後に目指す流れ</span><ol class="work-steps"><li>許可された情報をまとめる</li><li>システムが集計し、AIが要約</li><li>人が確認して対応を決める</li></ol></div>
        </div>
      </section>
      <section class="welcome-results" aria-labelledby="results-title">
        <div class="welcome-section-heading"><h2 id="results-title">効果は、実際の仕事で確かめます。</h2><p>まず1〜2店舗で試し、導入前後の変化を比べます。</p></div>
        <div class="results-grid"><div><h3>作業時間</h3><p>報告の作成や数字の確認にかかる時間</p></div><div><h3>対応の進み具合</h3><p>未対応の件数や、期限内に対応できた割合</p></div><div><h3>会員の継続</h3><p>退会率や会員数の変化</p></div></div>
        <p class="welcome-detail-note">減らせた作業時間と導入・運用費用を比べ、続ける価値を判断します。業績の変化は季節やキャンペーンの影響も確認します。</p>
        <button class="button" type="button" data-go="impact">効果の見方をデモで確認 →</button>
      </section>
      <div class="welcome-bottom"><p>まずは、国内外の3モデルをまとめて見るところから体験してください。</p><button class="button primary" type="button" data-gooverview>デモを見る →</button></div>
      <p class="welcome-detail-note">会社・事業情報の参照：<a href="https://laviche-preview.pages.dev/company.html" target="_blank" rel="noopener noreferrer">ラ・ヴィーチェの関係者向け紹介サイト</a>。デモ内の数値・AIコメントは別途作成した架空例です。</p>
    </section>`;
  }
  function metrics(scope='all',currency='JPY') {
    const s=D.summary(scope,currency);
    return `<div class="metrics"><div class="metric"><div class="metric-label">売上</div><div class="metric-value"><span class="unit-prefix">${currencySymbol(s.currency)}</span>${number(s.revenue)}</div><div class="metric-foot"><span class="${s.revenueChangePercent>=0?'positive':'negative'}">${signed(s.revenueChangePercent)}%</span><span>前月比</span></div></div><div class="metric"><div class="metric-label">営業利益（簡易）</div><div class="metric-value"><span class="unit-prefix">${currencySymbol(s.currency)}</span>${number(s.profit)}</div><div class="metric-foot"><span class="${s.profitChangePercent>=0?'positive':'negative'}">${signed(s.profitChangePercent)}%</span><span>売上 − 費用</span></div></div><div class="metric"><div class="metric-label">月末会員数</div><div class="metric-value">${number(s.members)}<small>人</small></div><div class="metric-foot"><span class="${s.netGrowth>=0?'positive':'negative'}">純増 ${s.netGrowth>=0?'+':''}${s.netGrowth}人</span><span>入会 ${s.joins} / 退会 ${s.leaves}</span></div></div><div class="metric"><div class="metric-label">月間退会率</div><div class="metric-value">${pct(s.churnPercent)}<small>%</small></div><div class="metric-foot"><span class="${s.churnPercent>s.previousChurnPercent?'negative':'neutral'}">${signed(s.churnPercent-s.previousChurnPercent)}pt</span><span>月初会員数基準</span></div></div></div>`;
  }
  function storeCards() {
    const selected=D.stores.filter(store=>state.country==='all'||store.country===state.country);
    return `<div class="section-heading"><h3>${scopeName()}の店舗別ハイライト</h3><span>金額は各店舗の現地通貨 · 店舗を選んで詳細へ</span></div><div class="store-grid">${selected.map(store=>{
      const s=D.summary(store.id,'local');
      const converted=D.summary(store.id);
      return `<button type="button" class="store-card" data-store="${store.id}" aria-label="${countryName(store.country)}・${store.name}の詳細を見る"><div class="store-card-head"><strong>${store.name}<small>${countryName(store.country)} · ${s.currency}</small></strong><span class="badge ${store.id==='B'?'warning':''}">${store.id==='B'?'優先確認':'モデル店舗'}</span></div><div class="store-card-metrics"><div>営業利益（現地通貨）<strong>${money(s.profit,s.currency)}</strong><small>円換算 ${money(converted.profit)}</small></div><div>退会率<strong>${pct(s.churnPercent)}%</strong></div><div>会員数<strong>${number(s.members)}人</strong></div></div><div class="store-card-footer"><span>利益前月比 <span class="${s.profitChangePercent>=0?'positive':'negative'}">${signed(s.profitChangePercent)}%</span></span><span aria-hidden="true">詳細 →</span></div></button>`;
    }).join('')}</div>`;
  }
  function countryCards() {
    return `<div class="section-heading"><h3>国別の比較 · 全${D.countries.length}か国</h3><span>金額は円換算 · 国・地域を選ぶと下の内容が切り替わります</span></div><div class="country-grid">${D.countries.map(country=>{
      const s=D.summary(country.id);
      const local=D.summary(country.id,'local');
      const active=state.country===country.id;
      return `<button type="button" class="country-card${active?' active':''}" data-country="${country.id}" aria-pressed="${active}" aria-label="${country.name}のモデル実績に切り替える"><div class="country-card-head"><strong>${country.name}</strong><span class="badge">${active?'選択中':`${s.storeCount}モデル`}</span></div><div class="country-stats"><div><span>売上（円換算）</span><strong>${money(s.revenue)}</strong></div><div><span>営業利益（円換算）</span><strong>${money(s.profit)}</strong></div><div><span>会員数</span><strong>${number(s.members)}人</strong></div><div><span>未対応</span><strong>${s.pending}件</strong></div></div><p class="intro-note">${s.storeCount}モデルの架空実績 · 現地売上：${money(local.revenue,local.currency)}（${local.currency}）</p></button>`;
    }).join('')}</div>`;
  }
  function overviewFocus() {
    const isPriority=state.country==='all'||state.country==='MY';
    const store=D.stores.find(item=>isPriority?item.id==='B':item.country===state.country);
    const s=D.summary(store.id);
    return `<section class="panel focus-panel"><span class="eyebrow">${scopeName()} / 確認手順の例</span><span class="badge${isPriority?' warning':''}">${isPriority?'優先確認の例':'通常フォローの例'}</span><h2>${store.name}。<br>${isPriority?'退会増加と未対応を確認。':'退会率は前月と同水準。'}</h2><p>${isPriority?'架空実績では退会率の上昇と未対応案件が見られます。担当責任者へ状況を確認する想定です。':`架空の未対応${s.pending}件を確認し、通常のフォローを継続する想定です。`}</p><div class="focus-evidence"><div>退会率<strong>${pct(s.churnPercent)}<small>%</small></strong></div><div>未対応フォロー<strong>${s.pending}<small>件</small></strong></div></div><button type="button" class="button primary" data-store="${store.id}">${store.name}の根拠を見る <span aria-hidden="true">→</span></button></section>`;
  }
  function overview() {
    const s=D.summary(state.country);
    const name=scopeName();
    return intro('EXECUTIVE BRIEF / LAVICHE · AMZ GROUP','国内外の店舗を、ひとつの画面で。','フィットネス3モデルの架空実績を円換算で比較。会社全事業や実際の全店舗の合計ではありません。') +
      `<div class="global-toolbar"><div><strong>${name} · ${s.countryCount}か国 / ${s.storeCount}モデル</strong><p>集計：2026年9月／円換算・架空実績</p></div><div class="segmented" aria-label="経営概況の対象国"><button type="button" data-country="all" aria-pressed="${state.country==='all'}">全店舗（モデル）</button>${D.countries.map(country=>`<button type="button" data-country="${country.id}" aria-pressed="${state.country===country.id}">${country.name}</button>`).join('')}</div></div>` + metrics(state.country) +
      `<p class="currency-note">${currencyNote}</p>` + countryCards() +
      `<div class="main-grid"><section class="panel"><div class="panel-head"><div><h3>${name}の業績推移</h3><p>2026年4月 — 9月 / 円換算・単位：万円 / 架空の月次実績</p></div><div class="segmented" aria-label="表示する指標"><button type="button" data-metric="revenue" aria-pressed="${state.metric==='revenue'}">売上</button><button type="button" data-metric="profit" aria-pressed="${state.metric==='profit'}">営業利益</button></div></div><div id="trend-chart" class="trend" role="img" aria-label="6か月の業績推移"></div><p class="chart-summary">${name}・9月（円換算）：売上 ${money(s.revenue)} − 費用 ${money(s.expenses)} = 営業利益 ${money(s.profit)}</p></section>${overviewFocus()}</div>` + storeCards();
  }
  function stores() {
    const id=state.store;
    const store=D.stores.find(x=>x.id===id);
    const s=D.summary(id,'local');
    const isB=id==='B';
    return intro('STORE INSIGHT',`${store.name}の変化を、数字で確認。`,`説明用モデルの架空実績です。${countryName(store.country)}・現地通貨 ${s.currency}（${currencySymbol(s.currency)}）で表示。実店舗の業績や課題ではありません。`) +
      `<button type="button" class="text-button" data-gooverview>← 全モデルの経営概況へ</button><div class="store-selector" aria-label="店舗を選択">${D.stores.map(x=>`<button type="button" data-select-store="${x.id}" aria-pressed="${x.id===id}">${countryName(x.country)} · ${x.name}</button>`).join('')}</div>` + metrics(id,'local') +
      `<div class="analysis-grid"><section class="panel"><div class="panel-head"><h3>退会率の変化</h3><span class="badge ${isB?'warning':''}">${isB?'前月比 +1.0pt':'前月と同水準'}</span></div><div class="comparison"><div class="comparison-cell"><span>8月</span><strong>${pct(s.previousChurnPercent)}<small>%</small></strong><p>退会 ${store.previousLeaves}人 / 月初 ${store.previousOpening}人</p></div><span aria-hidden="true">→</span><div class="comparison-cell ${isB?'current':''}"><span>9月</span><strong>${pct(s.churnPercent)}<small>%</small></strong><p>退会 ${s.leaves}人 / 月初 ${s.opening}人</p></div></div><p class="formula">退会率 = 月間退会者数 ÷ 月初会員数 × 100</p></section><section class="panel"><div class="panel-head"><h3>店舗に確認する数字</h3><span class="badge">9月末時点</span></div><ul class="evidence-list"><li><span>フォロー対象</span><strong>${s.followupsTotal}<small> 件</small></strong></li><li><span>対応完了</span><strong>${s.followupsCompleted}<small> 件</small></strong></li><li><span>未対応</span><strong class="${isB?'negative':''}">${s.pending}<small> 件</small></strong></li><li><span>対応完了率</span><strong>${pct(s.completionPercent)}<small> %</small></strong></li></ul></section></div><section class="ai-panel"><span class="ai-mark">AI</span><div class="ai-content"><h3>AI提案の表示例</h3><p>${isB?'退会率が前月より1.0ポイント上昇し、12件のフォローが未対応です。まず未対応案件の内容と担当状況を、店舗責任者が確認することを提案します。':`退会率は前月と同水準です。未対応${s.pending}件の状況を確認し、通常のフォローを継続することを提案します。`}</p><small>事前に用意した提案例です。未対応と退会の因果関係は未確認で、AIによる予測・自動判断ではありません。</small>${isB?'<button type="button" class="button primary" data-go="actions">改善アクションを確認 →</button>':`<button type="button" class="button" data-select-store="B">${modelName('B')}を見る →</button>`}</div></section><details class="source-details"><summary>数値の出所・集計範囲</summary><p>${store.brand} / ${store.operator}の事業情報をもとにした説明モデルです。数値はすべて架空で、実際の店舗には対応していません。売上・費用は月次集計、会員数は月初＋入会−退会、フォローは対象案件数から集計しています。実際の導入では、利用許可のあるデータのみを連携し、対象期間・更新日時・集計ルールを表示します。</p></details>`;
  }
  function actions() {
    const task=state.task;
    return intro('FROM INSIGHT TO ACTION','気づきを、実行につなげる。',`${modelName('B')}の架空の対応例。誰が・いつまでに・何をするかを明確にし、本部と店舗で共有。`) +
      `<div class="action-layout"><section class="panel"><div class="panel-head"><span class="badge warning">${modelName('B')} · フォロー改善</span><span class="badge ${task?'green':''}">${task?'デモ内で担当設定済み':'対応案'}</span></div><h2 class="action-title">未対応12件の状況を確認し、<br>次のフォローを決める。</h2><p class="action-intro">個々の会員への連絡や支援は、店舗スタッフが内容を確認して実施します。</p><dl class="action-meta"><div><dt>担当責任者</dt><dd>${task?task.owner:'未設定'}</dd></div><div><dt>確認期限</dt><dd>${task?task.due.replaceAll('-',' / '):'未設定'}</dd></div><div><dt>対象</dt><dd>${modelName('B')}の未対応フォロー12件（架空）</dd></div><div><dt>後日の確認指標</dt><dd>対応完了率・退会率</dd></div></dl><ol class="steps"><li><strong>未対応の理由を確認</strong><small>担当・対応履歴・連絡の可否を店舗で確認。</small></li><li><strong>必要なフォローを実施</strong><small>本人の状況に合った支援を、スタッフが判断。</small></li><li><strong>実施結果を記録</strong><small>対応状況を共有し、翌月の変化を比較。</small></li></ol>${task?`<div class="status-line"><label class="field" style="margin:0">デモ内のタスク進捗<select id="task-status"><option${task.status==='未着手'?' selected':''}>未着手</option><option${task.status==='対応中'?' selected':''}>対応中</option><option${task.status==='完了'?' selected':''}>完了</option></select></label><button type="button" class="button" data-open-action>担当・期限を変更</button></div>`:'<button type="button" class="button primary" data-open-action>担当・期限を決める →</button>'}<p class="sim-note">この操作で顧客への連絡や実データの更新は行われません。タスク完了によって業績数値が変化する演出も行いません。</p></section><aside class="panel side-note"><span class="eyebrow">MANAGEMENT LOOP</span><h3>提案から、結果の確認まで。</h3><p>経営者は、各店舗への個別確認を繰り返す代わりに、担当と進捗をまとめて確認できます。</p><ul class="evidence-list"><li><span>気づき</span><span>退会率の変化</span></li><li><span>判断</span><span>店舗に確認</span></li><li><span>実行</span><span>担当・期限を設定</span></li><li><span>評価</span><span>実施状況と業績を比較</span></li></ul><button type="button" class="button full-width" style="margin-top:22px" data-go="impact">効果の見方へ →</button></aside></div>`;
  }
  function impact() {
    return intro('MEASURE THE VALUE','導入効果を、確かめながら。',`${modelName('B')}を使った仮定の試算。通貨は MYR（RM）で、実際の会費や業績は示していません。`) +
      `<div class="impact-grid"><section class="panel"><div class="panel-head"><div><h3>継続支援の売上シミュレーション</h3><p>追加で1か月継続する人数と会費を仮定</p></div><span class="badge">仮定による試算</span></div><label class="field"><span class="field-top"><span>追加で継続する人数</span><strong id="people-value">${state.people}<small> 人</small></strong></span><input id="sim-people" type="range" min="0" max="30" step="1" value="${state.people}"></label><label class="field"><span class="field-top"><span>1人あたり月会費（RM）</span></span><input id="sim-fee" type="number" min="0" max="1000" step="1" value="${state.fee}" inputmode="numeric" required></label><div class="sim-result" aria-live="polite"><span>1か月分の追加会費売上</span><strong><small>RM</small><b id="sim-value" style="font-weight:500">${number(state.people*state.fee)}</b></strong><p id="sim-formula">${state.people}人 × RM ${number(state.fee)} / 月</p></div><p class="sim-note">改善を保証する予測ではありません。割引・返金・追加費用等を含まない会費売上の単純計算で、利益額ではありません。</p></section><section class="panel"><div class="panel-head"><h3>試験導入で測ること</h3><span class="badge">${modelName('B')}の架空基準値</span></div><div class="measure-row"><h3>対応が進んだか</h3><div class="measure-values"><strong>60.0%</strong><span>9月の対応完了率 → 導入後と比較</span></div><p>18件完了 / 対象30件。担当設定だけで改善済みと判定しません。</p></div><div class="measure-row"><h3>会員の継続に変化があったか</h3><div class="measure-values"><strong>3.0%</strong><span>9月の退会率 → 同じ定義で追跡</span></div><p>季節性やキャンペーンも確認し、AI単独の効果と断定しません。</p></div><div class="measure-row"><h3>報告・確認の負担が減ったか</h3><div class="measure-values"><strong>導入前に計測</strong></div><p>店舗の入力時間と本部の集計時間を、導入前後で記録します。</p></div><button type="button" class="button full-width" style="margin-top:16px" data-go="rollout">試験導入の進め方 →</button></section></div>`;
  }
  function rollout() {
    return intro('START SMALL, VERIFY, EXPAND','まず1〜2店舗で、価値を確認。','既存システムを活かし、使えるデータと現場の負担を確認しながら導入します。') +
      `<div class="phase-grid">
        <section class="phase"><span class="phase-day">01 / DAY 1–30</span><h2>確認と設計</h2><p>国・地域ごとの契約とデータ利用条件を確認。共通の集計指標、閲覧範囲、運用責任者を決めます。</p><div class="phase-goal">判断：使えるデータと試す範囲</div></section>
        <section class="phase"><span class="phase-day">02 / DAY 31–60</span><h2>1〜2店舗で試す</h2><p>経営概況と対応管理から開始。実際に使うスタッフが入力負担と数字の正しさを確認します。</p><div class="phase-goal">判断：現場で運用できるか</div></section>
        <section class="phase"><span class="phase-day">03 / DAY 61–90</span><h2>評価して拡大</h2><p>対応率・報告時間・業績の変化を比較。改善点と費用を整理し、次の店舗への展開を判断します。</p><div class="phase-goal">判断：継続・改善・拡大</div></section>
      </div>
      <section class="panel">
        <div class="panel-head"><div><h3>既存の仕組みと、つなぐ構成</h3><p>本番導入時の提案範囲 · 各国・地域の契約、承認、データ移転条件は未確認</p></div><span class="badge">このデモは未接続</span></div>
        <p class="intro-note">会員情報は国・地域ごとの承認された環境で管理し、共有が認められた集計情報を経営者の共通画面へ届ける設計案です。すべての個人情報を一つのDBへ集める前提ではありません。</p>
        <div class="system-flow"><div class="system-node"><strong>国・地域ごとの承認環境</strong><small>既存の会員管理・決済・入退館</small></div><span class="system-arrow" aria-hidden="true">→</span><div class="system-node"><strong>許可された経営情報を集計</strong><small>期間・通貨・指標をそろえる</small></div><span class="system-arrow" aria-hidden="true">→</span><div class="system-node"><strong>経営者の共通画面</strong><small>全店舗 → 国・地域 → 店舗</small></div></div>
        <div class="safe-grid"><div><strong>アクセスを限定</strong><p>個別アカウントと多要素認証。店舗・役割ごとの権限をサーバーで検証。</p></div><div><strong>開発と本番を分離</strong><p>顧客情報は許可された範囲で利用。検証用DB・接続キーを本番と分離。</p></div><div><strong>復旧まで備える</strong><p>操作記録とDB・ファイルのバックアップ。復元できることを確認。</p></div></div>
      </section>
      <div class="rollout-bottom"><div><h3>最初の意思決定は、試す店舗と責任者。</h3><p>対象店舗・責任者・評価指標・許可されるデータを決め、導入範囲を具体化します。</p></div><button type="button" class="button primary" data-gooverview>全モデルの経営概況へ →</button></div>
      <p class="sim-note">90日は進め方の例で、開発納期や効果の保証ではありません。国・地域をまたぐ情報共有の可否とAIへの外部送信条件は、それぞれ確認します。権限管理や自動連携はこのデモには実装していません。</p>`;
  }
  function drawChart() {
    const el=document.getElementById('trend-chart'); if(!el) return;
    const points=D.monthlySeries(state.country);
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
      body+=`<line x1="${left}" y1="${py}" x2="${width-right}" y2="${py}" stroke="#e4e4dc"/><text x="${left-9}" y="${py+4}" text-anchor="end" fill="#34342e" font-size="10">${Math.round(v/10000)}</text>`;
    }
    points.forEach((p,i)=>{
      const x=left+step*(i+.5),v=p[state.metric],py=y(v),last=i===points.length-1;
      body+=`<rect x="${x-bar/2}" y="${py}" width="${bar}" height="${Math.max(1,top+plotH-py)}" rx="4" fill="${last?'#c1a021':'#c8c9c2'}"><title>${p.label} ${state.metric==='revenue'?'売上':'営業利益'} ${money(v)}</title></rect><text x="${x}" y="${py-8}" text-anchor="middle" fill="#34342e" font-size="10">${(v/10000).toFixed(1)}</text><text x="${x}" y="${height-12}" text-anchor="middle" fill="#34342e" font-size="11">${p.label}</text>`;
    });
    el.setAttribute('aria-label',`${scopeName()}の${state.metric==='revenue'?'売上':'営業利益'}推移、円換算。${points.map(p=>`${p.label} ${money(p[state.metric])}`).join('、')}。全数値は架空。`);
    el.innerHTML=`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><text x="0" y="12" fill="#34342e" font-size="10">万円</text>${body}</svg>`;
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
      const store=D.stores.find(item=>item.id===state.store);
      document.getElementById('tour-title').textContent=`${store.name}の状況を、数字で確かめる`;
      document.getElementById('tour-note').textContent=`金額は現地通貨 ${store.currency}。退会率 ${pct(s.previousChurnPercent)}% → ${pct(s.churnPercent)}%。未対応 ${s.pending}件。次に${modelName('B')}の架空の対応案を確認します。`;
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
    form.elements.owner.value=state.task?state.task.owner:'マレーシア店舗 責任者';
    form.elements.due.value=state.task?state.task.due:'2026-10-21';
    dialog.showModal();
  }
  document.getElementById('navigation').addEventListener('click',e=>{
    const b=e.target.closest('[data-view]');if(b)navigate(b.dataset.view);
  });
  main.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-gooverview')){state.country='all';navigate('overview');}
    else if(b.dataset.go)navigate(b.dataset.go);
    else if(b.hasAttribute('data-start-tour'))startTour();
    else if(b.dataset.country && (b.dataset.country==='all'||D.countries.some(country=>country.id===b.dataset.country))){state.country=b.dataset.country;render();}
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
    if(!['マレーシア店舗 責任者','本部 運営担当'].includes(owner)||!/^2026-\d{2}-\d{2}$/.test(due))return;
    state.task={owner,due,status:state.task?state.task.status:'未着手'};
    dialog.close();render();notify('デモ内のアクションに追加しました。外部への通知はありません。');
  });
  document.getElementById('dialog-close').addEventListener('click',()=>dialog.close());
  function startTour() {
    state.tour=true;state.step=0;state.country='all';state.store='B';navigate(tourSteps[0].view);
  }
  document.getElementById('tour-start').addEventListener('click',startTour);
  function moveTour(delta) {
    const lastStep=tourSteps.length-1;
    if(delta>0&&state.step===lastStep){state.tour=false;updateTour();notify('説明を終了しました。各画面は引き続き自由に操作できます。');return;}
    state.step=Math.max(0,Math.min(lastStep,state.step+delta));
    state.country='all';
    if(tourSteps[state.step].view==='stores')state.store='B';
    navigate(tourSteps[state.step].view);
  }
  document.getElementById('tour-prev').addEventListener('click',()=>moveTour(-1));
  document.getElementById('tour-next').addEventListener('click',()=>moveTour(1));
  document.getElementById('tour-close').addEventListener('click',()=>{state.tour=false;updateTour();});
  document.getElementById('reset-demo').addEventListener('click',()=>{
    state.task=null;state.people=10;state.fee=180;state.metric='revenue';state.country='all';state.store='B';state.tour=false;state.step=0;
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
