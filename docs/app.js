(() => {
  'use strict';
  const D = window.FHRData;
  const R = window.RetentionData;
  const modelName = id => D.stores.find(store=>store.id===id).name;
  const main = document.getElementById('main');
  const dialog = document.getElementById('action-dialog');
  const labels = {intro:'この資料について',overview:'経営概況',stores:'店舗の課題',retention:'会員フォロー',actions:'改善アクション',impact:'効果を考える',rollout:'導入プラン'};
  const retentionStatusLabels = {unassigned:'未対応',planned:'対応予定',contacted:'連絡済み',closed:'対応完了'};
  const state = {view:'intro',country:'all',store:'B',metric:'revenue',task:null,people:10,fee:180,tour:false,step:0,retentionCountry:'all',retentionStore:'all',retentionId:R.cases[0].id,retentionRecords:R.initialRecords()};
  const tourSteps = [
    {view:'intro',title:'LAVICHE / AMZ GROUPの店舗管理を考える',note:'国内AFとマレーシアAFの2店舗で、一元管理と日々の会員フォローを体験します。表示内容はデモ用です。'},
    {view:'overview',title:'全体から、国別、店舗別へ',note:'2店舗の業績を円換算で比較します。日本・マレーシアを切り替え、気になる店舗を詳しく確認できます。'},
    {view:'stores',title:`${modelName('B')}の課題を、数字で確かめる`,note:'金額は現地通貨で表示します。退会率と未対応フォローから、次に確認することを考えます。'},
    {view:'retention',title:'フォローが必要な会員へ、次の対応を',note:'10月14日の会員一覧から、担当・期限・対応状況を記録します。連絡したことと、来館再開などの結果は分けて確認します。次は9月の店舗改善例に戻ります。'},
    {view:'actions',title:'提案を、担当と期限のある行動にする',note:'「担当・期限を決める」を押して、デモ内のアクションに追加してください。'},
    {view:'impact',title:'実行と成果を分けて、効果を測る',note:'対応の完了率と退会率を追います。売上への影響は仮定を変えて試算できます。'},
    {view:'rollout',title:'小さく試して、導入を判断する',note:'最初は1〜2店舗。データの利用条件と効果を確認してから拡大します。'}
  ];
  const number = n => new Intl.NumberFormat('ja-JP',{maximumFractionDigits:0}).format(n);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pct = n => n.toFixed(1);
  const signed = n => `${n>=0?'+':''}${pct(n)}`;
  const currencySymbol = currency => ({JPY:'¥',MYR:'RM'})[currency];
  const money = (n,currency='JPY') => `${currencySymbol(currency)} ${number(n)}`;
  const countryName = id => D.countries.find(country=>country.id===id).name;
  const scopeName = () => state.country==='all'?'全店舗':countryName(state.country);
  const currencyNote = '円換算は説明用の固定レート：1 MYR = 30円。実勢レートではありません。全期間に同じレートを使用しています。';
  let chartObserver;
  let toastTimer;
  function intro(kicker,title,subtitle) {
    return `<div class="page-intro"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p class="intro-note">${subtitle}</p></div><div class="period">REPORTING PERIOD<strong>2026.09</strong>月次実績 · デモ</div></div>`;
  }
  function introduction() {
    return `<section class="welcome-page">
      <div class="welcome-hero">
        <div class="welcome-copy">
          <span class="eyebrow">LAVICHE / AMZ GROUP · この資料について</span>
          <h1>国内外の店舗を、<br>ひとつの画面で。</h1>
          <p class="welcome-lead">売上・利益・会員数・対応状況を一元表示。<br>日本とマレーシアの店舗をまとめて確認。</p>
          <div class="welcome-buttons"><button class="button primary" type="button" data-gooverview>デモを見る →</button><button class="button" type="button" data-start-tour>説明に沿って見る</button></div>
          <p class="welcome-sample">氏名・会員番号・数値は架空です。実データ・AIは未接続。</p>
        </div>
        <aside class="welcome-decision">
          <span class="eyebrow">このデモでできること</span>
          <h2>店舗を比較。<br>課題を確認。<br>対応を管理。</h2>
          <p>会員フォローの記録と、AIレポートの表示例を体験。</p>
          <div class="welcome-decision-note">既存システムを活用。連携条件は導入前に確認。</div>
        </aside>
      </div>
      <section class="unified-brief" aria-labelledby="unified-title">
        <span class="eyebrow">一元管理で、全体から詳細へ</span><h2 id="unified-title">経営者は全体を、担当者は必要な範囲を。</h2>
        <p>国・地域ごとの情報を行き来せず、売上・利益・会員の増減・対応状況をまとめて把握。気になる国・地域から店舗へ、詳しく確認できます。</p>
        <ol class="unified-steps"><li><strong>全店舗</strong><span>国・地域をまたいだ全体像を確認</span></li><li><strong>国・地域別</strong><span>円換算で状況を比較</span></li><li><strong>店舗別</strong><span>現地通貨と根拠を確認</span></li></ol>
        <p class="welcome-detail-note">本番では、共有が認められた経営情報を集計して表示する設計です。会員の個人情報は承認された環境で管理し、役割ごとの閲覧範囲を設定します。デモの閲覧権限は未実装です。</p>
      </section>
      <section class="welcome-section" aria-labelledby="business-scope-title">
        <div class="welcome-section-heading"><span class="eyebrow">対象事業</span><h2 id="business-scope-title">国内とマレーシアのANYTIME FITNESS。</h2><p>国内AF店舗・マレーシアAF店舗の2店舗構成で、日々の管理業務を紹介します。</p></div>
        <div class="results-grid"><div><h3>国内ANYTIME FITNESS</h3><p>株式会社ラ・ヴィーチェの国内事業。</p></div><div><h3>マレーシアANYTIME FITNESS</h3><p>FHR ALLIANCE SDN BHD.による海外事業。</p></div></div>
        <p class="welcome-detail-note">今回の集計対象は上記2店舗です。グループの全事業・実際の全店舗を集計したものではありません。</p>
      </section>
      <section class="welcome-section" aria-labelledby="managed-title">
        <div class="welcome-section-heading"><span class="eyebrow">何を管理する？</span><h2 id="managed-title">店舗の数字と、日々の対応をまとめます。</h2><p>数字を見るだけでなく、確認が必要な店舗と次の対応がわかるようにします。</p></div>
        <div class="management-list">
          <article class="management-row"><div class="management-topic"><h3>売上・利益・経費</h3><small>売上、費用、店舗ごとの利益</small></div><p class="management-benefit">店舗ごとの差を比べ、売上や経費を見直すきっかけに。</p><span class="badge">デモで確認</span></article>
          <article class="management-row"><div class="management-topic"><h3>会員の増減</h3><small>会員数、入会数、退会数</small></div><p class="management-benefit">退会が増えている店舗に気づき、必要なフォローを検討。</p><span class="badge">デモで確認</span></article>
          <article class="management-row"><div class="management-topic"><h3>スタッフの対応</h3><small>未対応の件数、担当者、期限、進み具合</small></div><p class="management-benefit">誰が、いつまでに動くかを共有し、対応漏れを防ぐ。</p><span class="badge">デモで確認</span></article>
          <article class="management-row"><div class="management-topic"><h3>会員フォロー</h3><small>来館の変化、担当者、対応状況、確認できた結果</small></div><p class="management-benefit">フォローが必要な会員を確認し、担当・期限・対応結果を記録。</p><span class="badge">操作できます</span></article>
          <article class="management-row"><div class="management-topic"><h3>集客・個別トレーニング</h3><small>見学予約、契約数、広告費など</small></div><p class="management-benefit">問い合わせから契約までを振り返り、集客や提案を改善。</p><span class="badge warning">導入時の追加案</span></article>
        </div>
        <p class="welcome-detail-note">店舗実績は9月、会員フォローは10月14日時点の表示です。実際の会員情報や、見学・広告などの連携範囲は導入前に確認します。</p>
      </section>
      <section class="welcome-section" aria-labelledby="retention-intro-title">
        <div class="welcome-section-heading"><span class="eyebrow">会員フォロー</span><h2 id="retention-intro-title">気になる変化から、次のフォローへ。</h2><p>来館頻度や会費の決済状況を確認し、担当者・期限・対応状況・結果を記録。経営者は、店舗ごとの対応状況をまとめて把握できます。</p></div>
        <button type="button" class="button primary" data-go-retention="all">会員フォローを見る →</button>
        <p class="welcome-detail-note">操作した内容は再読み込み・リセットで消えます。実際の会員への連絡や外部送信は行いません。</p>
      </section>
      <section class="welcome-ai" aria-labelledby="ai-value-title">
        <div class="welcome-section-heading"><span class="badge">本番導入時の活用案</span><span class="eyebrow">AIは何を手伝う？</span><h2 id="ai-value-title">AIで、確認と報告の手間を減らす。</h2><p>AIが確認の準備を手伝い、経営者や店舗責任者が内容を確かめて判断します。</p></div>
        <div class="ai-value-grid">
          <article class="ai-value-card"><span class="ai-value-number">01</span><h3>報告を短くまとめる</h3><p>店舗ごとの実績から、要点をまとめた週次報告の下書きを用意します。</p><strong class="ai-value-benefit">報告を書く手間を減らす</strong></article>
          <article class="ai-value-card"><span class="ai-value-number">02</span><h3>気になる変化を整理する</h3><p>集計結果をもとに、売上の低下や退会の増加など、確認する点と根拠の数字を整理します。</p><strong class="ai-value-benefit">確認する順番を決めやすくする</strong></article>
          <article class="ai-value-card"><span class="ai-value-number">03</span><h3>次の対応案をつくる</h3><p>店舗に確認する内容や改善案、スタッフへ共有する文章の下書きを用意します。</p><strong class="ai-value-benefit">ゼロから考える負担を減らす</strong></article>
        </div>
        <div class="ai-report-example"><div class="ai-report-label">数字を、確認しやすい報告に<span class="badge">AIレポートの表示例</span></div><blockquote>${modelName('B')}では、退会率が前月の2.0%から3.0%に上昇しています。未対応フォロー12件の状況を、担当責任者に確認しましょう。</blockquote><button class="text-button" type="button" data-store="B">根拠の数字を見る →</button></div>
        <p class="welcome-detail-note">AIコメントは事前に用意した表示例で、AIサービスは未接続です。本番では、集計結果の説明や下書きをAIが支援し、採用や会員への連絡は人が確認して決めます。</p>
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
      <div class="welcome-bottom"><p>まずは、国内外の2店舗をまとめて見るところから体験してください。</p><button class="button primary" type="button" data-gooverview>デモを見る →</button></div>
      <p class="welcome-detail-note">会社・事業情報の参照：<a href="https://laviche-preview.pages.dev/company.html" target="_blank" rel="noopener noreferrer">ラ・ヴィーチェの関係者向け紹介サイト</a>。</p>
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
      return `<button type="button" class="store-card" data-store="${store.id}" aria-label="${countryName(store.country)}・${store.name}の詳細を見る"><div class="store-card-head"><strong>${store.name}<small>${countryName(store.country)} · ${s.currency}</small></strong><span class="badge ${store.id==='B'?'warning':''}">${store.id==='B'?'優先確認':'通常確認'}</span></div><div class="store-card-metrics"><div>営業利益（現地通貨）<strong>${money(s.profit,s.currency)}</strong><small>円換算 ${money(converted.profit)}</small></div><div>退会率<strong>${pct(s.churnPercent)}%</strong></div><div>会員数<strong>${number(s.members)}人</strong></div></div><div class="store-card-footer"><span>利益前月比 <span class="${s.profitChangePercent>=0?'positive':'negative'}">${signed(s.profitChangePercent)}%</span></span><span aria-hidden="true">詳細 →</span></div></button>`;
    }).join('')}</div>`;
  }
  function countryCards() {
    return `<div class="section-heading"><h3>国別の比較 · 全${D.countries.length}か国</h3><span>金額は円換算 · 国・地域を選ぶと下の内容が切り替わります</span></div><div class="country-grid">${D.countries.map(country=>{
      const s=D.summary(country.id);
      const local=D.summary(country.id,'local');
      const active=state.country===country.id;
      return `<button type="button" class="country-card${active?' active':''}" data-country="${country.id}" aria-pressed="${active}" aria-label="${country.name}の店舗実績に切り替える"><div class="country-card-head"><strong>${country.name}</strong><span class="badge">${active?'選択中':`${s.storeCount}店舗`}</span></div><div class="country-stats"><div><span>売上（円換算）</span><strong>${money(s.revenue)}</strong></div><div><span>営業利益（円換算）</span><strong>${money(s.profit)}</strong></div><div><span>会員数</span><strong>${number(s.members)}人</strong></div><div><span>未対応</span><strong>${s.pending}件</strong></div></div><p class="intro-note">${s.storeCount}店舗 · 現地売上：${money(local.revenue,local.currency)}（${local.currency}）</p></button>`;
    }).join('')}</div>`;
  }
  function overviewFocus() {
    const isPriority=state.country==='all'||state.country==='MY';
    const store=D.stores.find(item=>isPriority?item.id==='B':item.country===state.country);
    const s=D.summary(store.id);
    return `<section class="panel focus-panel"><span class="eyebrow">${scopeName()} / 今月の確認事項</span><span class="badge${isPriority?' warning':''}">${isPriority?'優先確認':'通常フォロー'}</span><h2>${store.name}。<br>${isPriority?'退会増加と未対応を確認。':'退会率は前月と同水準。'}</h2><p>${isPriority?'退会率が上昇しています。未対応フォローの状況を、店舗責任者に確認してください。':`未対応${s.pending}件の状況を確認し、通常のフォローを続けます。`}</p><div class="focus-evidence"><div>退会率<strong>${pct(s.churnPercent)}<small>%</small></strong></div><div>未対応フォロー<strong>${s.pending}<small>件</small></strong></div></div><button type="button" class="button primary" data-store="${store.id}">${store.name}の根拠を見る <span aria-hidden="true">→</span></button></section>`;
  }
  function overview() {
    const s=D.summary(state.country);
    const name=scopeName();
    return intro('EXECUTIVE BRIEF / LAVICHE · AMZ GROUP','国内外の店舗を、ひとつの画面で。','国内・マレーシアの2店舗を円換算で比較します。数値はすべてデモ用です。') +
      `<div class="global-toolbar"><div><strong>${name} · ${s.countryCount}か国 / ${s.storeCount}店舗</strong><p>集計：2026年9月／円換算</p></div><div class="segmented" aria-label="経営概況の対象国"><button type="button" data-country="all" aria-pressed="${state.country==='all'}">全店舗</button>${D.countries.map(country=>`<button type="button" data-country="${country.id}" aria-pressed="${state.country===country.id}">${country.name}</button>`).join('')}</div></div>` + metrics(state.country) +
      `<p class="currency-note">${currencyNote}</p>` + countryCards() +
      `<div class="main-grid"><section class="panel"><div class="panel-head"><div><h3>${name}の業績推移</h3><p>2026年4月 — 9月 / 円換算・単位：万円 / 月次実績</p></div><div class="segmented" aria-label="表示する指標"><button type="button" data-metric="revenue" aria-pressed="${state.metric==='revenue'}">売上</button><button type="button" data-metric="profit" aria-pressed="${state.metric==='profit'}">営業利益</button></div></div><div id="trend-chart" class="trend" role="img" aria-label="6か月の業績推移"></div><p class="chart-summary">${name}・9月（円換算）：売上 ${money(s.revenue)} − 費用 ${money(s.expenses)} = 営業利益 ${money(s.profit)}</p></section>${overviewFocus()}</div>` + storeCards() + retentionLink(state.country);
  }
  function stores() {
    const id=state.store;
    const store=D.stores.find(x=>x.id===id);
    const s=D.summary(id,'local');
    const isB=id==='B';
    return intro('STORE INSIGHT',`${store.name}の変化を、数字で確認。`,`${countryName(store.country)}・現地通貨 ${s.currency}（${currencySymbol(s.currency)}）で表示します。数値はすべてデモ用です。`) +
      `<button type="button" class="text-button" data-gooverview>← 全店舗の経営概況へ</button><div class="store-selector" aria-label="店舗を選択">${D.stores.map(x=>`<button type="button" data-select-store="${x.id}" aria-pressed="${x.id===id}">${countryName(x.country)} · ${x.name}</button>`).join('')}</div>` + metrics(id,'local') +
      `<div class="analysis-grid"><section class="panel"><div class="panel-head"><h3>退会率の変化</h3><span class="badge ${isB?'warning':''}">${isB?'前月比 +1.0pt':'前月と同水準'}</span></div><div class="comparison"><div class="comparison-cell"><span>8月</span><strong>${pct(s.previousChurnPercent)}<small>%</small></strong><p>退会 ${store.previousLeaves}人 / 月初 ${store.previousOpening}人</p></div><span aria-hidden="true">→</span><div class="comparison-cell ${isB?'current':''}"><span>9月</span><strong>${pct(s.churnPercent)}<small>%</small></strong><p>退会 ${s.leaves}人 / 月初 ${s.opening}人</p></div></div><p class="formula">退会率 = 月間退会者数 ÷ 月初会員数 × 100</p></section><section class="panel"><div class="panel-head"><h3>店舗に確認する数字</h3><span class="badge">9月末時点</span></div><ul class="evidence-list"><li><span>フォロー対象</span><strong>${s.followupsTotal}<small> 件</small></strong></li><li><span>対応完了</span><strong>${s.followupsCompleted}<small> 件</small></strong></li><li><span>未対応</span><strong class="${isB?'negative':''}">${s.pending}<small> 件</small></strong></li><li><span>対応完了率</span><strong>${pct(s.completionPercent)}<small> %</small></strong></li></ul></section></div><section class="ai-panel"><span class="ai-mark">AI</span><div class="ai-content"><h3>AI提案の表示例</h3><p>${isB?'退会率が前月より1.0ポイント上昇し、12件のフォローが未対応です。まず対象者の状況と担当を、店舗責任者が確認することを提案します。':`退会率は前月と同水準です。未対応${s.pending}件の状況を確認し、通常のフォローを継続することを提案します。`}</p><small>表示用の提案例です。未対応と退会の因果関係は店舗で確認します。</small>${isB?'<button type="button" class="button primary" data-go="actions">改善アクションを確認 →</button>':`<button type="button" class="button" data-select-store="B">${modelName('B')}を見る →</button>`}</div></section><details class="source-details"><summary>数値の出所・集計範囲</summary><p>表示事業：${store.brand} / ${store.operator}。売上・費用は月次集計、会員数は月初＋入会−退会、フォローは対象者数から集計しています。実際の導入では、利用許可のあるデータのみを連携し、対象期間・更新日時・集計ルールを表示します。</p></details>` + retentionLink(id);
  }
  function retentionLink(scope='all') {
    return `<section class="rollout-bottom"><div><h3>フォローが必要な会員を確認する。</h3><p>10月14日時点の会員一覧から、担当者・対応状況・結果を記録できます。9月の店舗実績とは別期間の情報です。</p></div><button type="button" class="button primary" data-go-retention="${escapeHTML(scope)}">会員フォローへ →</button></section>`;
  }
  function retentionScope() {
    return state.retentionStore==='all'?state.retentionCountry:state.retentionStore;
  }
  function retentionStores() {
    return D.stores.filter(store=>state.retentionCountry==='all'||store.country===state.retentionCountry);
  }
  function retentionCases() {
    const storeIds=retentionStores().map(store=>store.id);
    return R.cases.filter(item=>storeIds.includes(item.storeId)&&(state.retentionStore==='all'||item.storeId===state.retentionStore));
  }
  function selectRetentionScope(scope='all') {
    const store=D.stores.find(item=>item.id===scope);
    if(store) {
      state.retentionCountry=store.country;
      state.retentionStore=store.id;
    } else if(scope==='all'||D.countries.some(country=>country.id===scope)) {
      state.retentionCountry=scope;
      state.retentionStore='all';
    } else return;
    const cases=retentionCases();
    if(!cases.some(item=>item.id===state.retentionId))state.retentionId=cases[0]?.id||'';
  }
  function retentionHistory(record) {
    if(!record.history.length)return '<p class="sim-note">まだ対応履歴はありません。担当者・期限・対応状況を選び、記録してください。</p>';
    return `<ol class="retention-history">${record.history.slice().reverse().map((entry,index)=>`<li><div class="retention-history-head"><strong>記録 ${record.history.length-index}</strong><span class="badge">${escapeHTML(retentionStatusLabels[entry.status])}</span></div><p>${escapeHTML(entry.owner)} / 期限 ${escapeHTML(entry.due)}</p><p>確認結果：${escapeHTML(R.outcomes[entry.outcome])}</p><p>${escapeHTML(entry.note)||'メモなし'}</p></li>`).join('')}</ol>`;
  }
  function retentionDetail(item) {
    if(!item)return '<section class="panel retention-detail"><h2>対象の会員はいません。</h2><p class="intro-note">国・店舗の選択を変更してください。</p></section>';
    const record=state.retentionRecords[item.id];
    const signals=R.signals(item);
    const closed=record.status==='closed';
    return `<section class="panel retention-detail" aria-labelledby="retention-detail-title">
      <div class="panel-head"><div><span class="eyebrow">${escapeHTML(modelName(item.storeId))}</span><h2 id="retention-detail-title" tabindex="-1">${escapeHTML(item.displayName)}</h2><p class="intro-note">会員番号：${escapeHTML(item.memberNumber)}</p></div><span class="badge${record.status==='unassigned'?' warning':''}">${escapeHTML(retentionStatusLabels[record.status])}</span></div>
      <h3>フォローが必要な理由</h3>
      <ul class="retention-signals">${signals.length?signals.map(signal=>`<li>${escapeHTML(signal)}</li>`).join(''):'<li>現在、確認が必要な変化はありません。</li>'}</ul>
      <dl class="retention-facts"><div><dt>その前28日間の来館</dt><dd>${number(item.previousVisits)}<small> 回</small></dd></div><div><dt>直近28日間の来館</dt><dd>${number(item.currentVisits)}<small> 回</small></dd></div><div><dt>最終来館から</dt><dd>${number(item.daysSinceVisit)}<small> 日</small></dd></div></dl>
      <p class="intro-note">会費の決済：${item.paymentIssue?'要確認':'確認事項なし'} / 契約更新まで：${Number.isInteger(item.renewalDays)?`${item.renewalDays}日`:'未設定'}</p>
      <details class="source-details"><summary>フォロー対象の確認基準</summary><p>直近28日間と、その前28日間の来館数を比較します。前期間4回以上かつ来館半減、14日以上来館なし、会費の決済要確認、契約更新30日以内を確認のきっかけとして表示します。変化の理由はスタッフが確認します。</p></details>
      <div class="retention-proposal"><span class="badge">対応のポイント</span><h3>${item.paymentIssue?'会費の決済状況を確認する。':'来館状況と、困っていることを確認する。'}</h3><p>${item.paymentIssue?'決済状況を確認し、必要に応じて支払方法や手続きの案内を検討します。':'来館の間隔が空いている理由を確認し、通いやすい時間帯やトレーニングの相談など、本人の希望に合う支援を検討します。'}連絡方法・内容は担当者が確認して決めます。</p><p class="sim-note">表示は設定済みの確認ルールと対応例です。AIの退会予測や自動連絡は実行していません。</p></div>
      <h3>対応内容を記録</h3>
      <form id="retention-form" class="retention-form" data-case-id="${escapeHTML(item.id)}">
        <label class="field">担当者<select id="retention-owner" name="owner" required><option value="">担当者を選択</option>${R.owners(item.storeId).map(owner=>`<option value="${escapeHTML(owner)}"${record.owner===owner?' selected':''}>${escapeHTML(owner)}</option>`).join('')}</select></label>
        <label class="field">対応期限<input id="retention-due" name="due" type="date" min="${R.asOf}" max="2026-12-31" value="${escapeHTML(record.due)}" required></label>
        <label class="field">対応状況<select id="retention-status" name="status" required><option value="" disabled${record.status==='unassigned'?' selected':''}>対応状況を選択</option>${['planned','contacted','closed'].map(status=>`<option value="${status}"${record.status===status?' selected':''}>${escapeHTML(retentionStatusLabels[status])}</option>`).join('')}</select></label>
        <label class="field">確認結果<select id="retention-outcome" name="outcome"${closed?' required':' disabled'} aria-describedby="retention-outcome-help"><option value=""${closed&&record.outcome==='unknown'?' selected':''}>確認した結果を選択</option><option value="unknown" hidden${!closed?' selected':''}>経過確認中</option>${['resumed','continuing','cancelled'].map(outcome=>`<option value="${outcome}"${closed&&record.outcome===outcome?' selected':''}>${escapeHTML(R.outcomes[outcome])}</option>`).join('')}</select></label>
        <p id="retention-outcome-help" class="sim-note retention-form-wide">${closed?'確認できた結果を選んでください。連絡しただけでは、来館再開・継続意向の確認にはなりません。':'「対応完了」にする場合は、確認できた結果を選択してください。対応予定・連絡済みは「経過確認中」として扱います。'}</p>
        <label class="field retention-form-wide">対応メモ<textarea id="retention-note" name="note" rows="3" maxlength="240" aria-describedby="retention-note-help" placeholder="例：電話で状況を確認。来週の来館に合わせてトレーニング相談を予定。">${escapeHTML(record.note)}</textarea><small id="retention-note-help"><span id="retention-note-count">${record.note.length}</span> / 240字 · 実在する方の個人情報は入力しないでください。</small></label>
        <p id="retention-error" class="retention-error retention-form-wide" role="alert" hidden></p>
        <div class="retention-form-wide"><button type="submit" class="button primary">対応を記録</button><p class="sim-note">会員への送信は行いません。入力は再読み込み・リセットで消えます。</p></div>
      </form>
      <h3>対応履歴</h3>${retentionHistory(record)}
    </section>`;
  }
  function retention() {
    const scope=retentionScope();
    const summary=R.summary(state.retentionRecords,scope);
    const cases=retentionCases();
    const selected=cases.find(item=>item.id===state.retentionId)||cases[0];
    if(selected)state.retentionId=selected.id;
    const stores=retentionStores().filter(store=>state.retentionStore==='all'||store.id===state.retentionStore);
    return `<div class="page-intro"><div><span class="eyebrow">MEMBER FOLLOW-UP / 会員フォロー</span><h1>フォローが必要な会員</h1><p class="intro-note">氏名・会員番号・数値はすべてデモ用です。10月14日時点のフォロー状況を表示しています。9月の店舗実績とは別期間の情報です。</p></div><div class="period">FOLLOW-UP<strong>${R.asOf.replaceAll('-','.')}</strong>確認日</div></div>
      <div class="retention-toolbar"><label class="field">国<select id="retention-country"><option value="all"${state.retentionCountry==='all'?' selected':''}>すべての国</option>${D.countries.map(country=>`<option value="${country.id}"${state.retentionCountry===country.id?' selected':''}>${escapeHTML(country.name)}</option>`).join('')}</select></label><label class="field">店舗<select id="retention-store"><option value="all"${state.retentionStore==='all'?' selected':''}>選択した国の全店舗</option>${retentionStores().map(store=>`<option value="${store.id}"${state.retentionStore===store.id?' selected':''}>${escapeHTML(store.name)}</option>`).join('')}</select></label><button type="button" class="button" data-go-retention="all">全${R.cases.length}人を表示</button></div>
      <div class="retention-summary" aria-label="会員フォローの対応状況"><div><span>フォロー対象会員</span><strong>${summary.total}<small> 人</small></strong></div><div><span>未対応</span><strong>${summary.unassigned}<small> 人</small></strong></div><div><span>対応中</span><strong>${summary.planned+summary.contacted}<small> 人</small></strong></div><div><span>対応完了</span><strong>${summary.closed}<small> 人</small></strong></div></div>
      <p class="sim-note">対応中：対応予定・連絡済み。確認結果：来館再開 ${summary.resumed}人 / 継続意向 ${summary.continuing}人 / 退会確認 ${summary.cancelled}人。対応完了は退会防止の成功を示すものではありません。</p>
      <div class="section-heading"><h3>店舗ごとの対応状況</h3><span>10月14日時点</span></div>
      <div class="retention-store-grid">${stores.map(store=>{const s=R.summary(state.retentionRecords,store.id);return `<button type="button" class="panel" data-retention-store="${store.id}" aria-label="${escapeHTML(store.name)}の会員に絞る"><h3>${escapeHTML(store.name)}</h3><p>対象 ${s.total}人 / 未対応 ${s.unassigned}人</p><p>対応中 ${s.planned+s.contacted}人 / 対応完了 ${s.closed}人</p></button>`;}).join('')}</div>
      <div class="retention-layout"><section class="panel retention-case-list" aria-labelledby="retention-case-list-title"><div class="panel-head"><h2 id="retention-case-list-title">会員一覧</h2><span class="badge">${cases.length}人</span></div>${cases.map(item=>{const record=state.retentionRecords[item.id];return `<button type="button" class="retention-case${selected?.id===item.id?' active':''}" data-retention-case="${escapeHTML(item.id)}" aria-pressed="${selected?.id===item.id}"><div class="retention-case-head"><div><strong>${escapeHTML(item.displayName)}</strong><small>${escapeHTML(item.memberNumber)}</small></div><span class="badge${record.status==='unassigned'?' warning':''}">${escapeHTML(retentionStatusLabels[record.status])}</span></div><p>${escapeHTML(modelName(item.storeId))}</p><p>${escapeHTML(R.signals(item)[0]||'状況を確認')}</p></button>`;}).join('')}</section>${retentionDetail(selected)}</div>`;
  }
  function actions() {
    const task=state.task;
    return intro('FROM INSIGHT TO ACTION','気づきを、実行につなげる。',`${modelName('B')}のフォロー改善。誰が・いつまでに・何をするかを明確にし、本部と店舗で共有。`) +
      `<div class="action-layout"><section class="panel"><div class="panel-head"><span class="badge warning">${modelName('B')} · フォロー改善</span><span class="badge ${task?'green':''}">${task?'担当設定済み':'対応案'}</span></div><h2 class="action-title">未対応12件の状況を確認し、<br>次のフォローを決める。</h2><p class="action-intro">個々の会員への連絡や支援は、店舗スタッフが内容を確認して実施します。</p><dl class="action-meta"><div><dt>担当責任者</dt><dd>${task?task.owner:'未設定'}</dd></div><div><dt>確認期限</dt><dd>${task?task.due.replaceAll('-',' / '):'未設定'}</dd></div><div><dt>対象</dt><dd>${modelName('B')}の未対応フォロー12件</dd></div><div><dt>後日の確認指標</dt><dd>対応完了率・退会率</dd></div></dl><ol class="steps"><li><strong>未対応の理由を確認</strong><small>担当・対応履歴・連絡の可否を店舗で確認。</small></li><li><strong>必要なフォローを実施</strong><small>本人の状況に合った支援を、スタッフが判断。</small></li><li><strong>実施結果を記録</strong><small>対応状況を共有し、翌月の変化を比較。</small></li></ol>${task?`<div class="status-line"><label class="field" style="margin:0">対応状況<select id="task-status"><option${task.status==='未着手'?' selected':''}>未着手</option><option${task.status==='対応中'?' selected':''}>対応中</option><option${task.status==='完了'?' selected':''}>完了</option></select></label><button type="button" class="button" data-open-action>担当・期限を変更</button></div>`:'<button type="button" class="button primary" data-open-action>担当・期限を決める →</button>'}<p class="sim-note">担当の設定・記録のみ行います。会員への送信はありません。</p></section><aside class="panel side-note"><span class="eyebrow">MANAGEMENT LOOP</span><h3>提案から、結果の確認まで。</h3><p>経営者は、各店舗への個別確認を繰り返す代わりに、担当と対応状況をまとめて確認できます。</p><ul class="evidence-list"><li><span>気づき</span><span>退会率の変化</span></li><li><span>判断</span><span>店舗に確認</span></li><li><span>実行</span><span>担当・期限を設定</span></li><li><span>評価</span><span>実施状況と業績を比較</span></li></ul><button type="button" class="button full-width" style="margin-top:22px" data-go="impact">効果の見方へ →</button></aside></div>`;
  }
  function impact() {
    return intro('MEASURE THE VALUE','導入効果を、確かめながら。',`${modelName('B')}を使った仮定の試算。通貨は MYR（RM）で、実際の会費や業績は示していません。`) +
      `<div class="impact-grid"><section class="panel"><div class="panel-head"><div><h3>継続支援の売上シミュレーション</h3><p>追加で1か月継続する人数と会費を仮定</p></div><span class="badge">仮定による試算</span></div><label class="field"><span class="field-top"><span>追加で継続する人数</span><strong id="people-value">${state.people}<small> 人</small></strong></span><input id="sim-people" type="range" min="0" max="30" step="1" value="${state.people}"></label><label class="field"><span class="field-top"><span>1人あたり月会費（RM）</span></span><input id="sim-fee" type="number" min="0" max="1000" step="1" value="${state.fee}" inputmode="numeric" required></label><div class="sim-result" aria-live="polite"><span>1か月分の追加会費売上</span><strong><small>RM</small><b id="sim-value" style="font-weight:500">${number(state.people*state.fee)}</b></strong><p id="sim-formula">${state.people}人 × RM ${number(state.fee)} / 月</p></div><p class="sim-note">改善を保証する予測ではありません。割引・返金・追加費用等を含まない会費売上の単純計算で、利益額ではありません。</p></section><section class="panel"><div class="panel-head"><h3>試験導入で測ること</h3><span class="badge">9月の基準値</span></div><div class="measure-row"><h3>対応が進んだか</h3><div class="measure-values"><strong>60.0%</strong><span>9月の対応完了率 → 導入後と比較</span></div><p>18件完了 / 対象30件。担当設定だけで改善済みと判定しません。</p></div><div class="measure-row"><h3>会員の継続に変化があったか</h3><div class="measure-values"><strong>3.0%</strong><span>9月の退会率 → 同じ定義で追跡</span></div><p>季節性やキャンペーンも確認し、AI単独の効果と断定しません。</p></div><div class="measure-row"><h3>報告・確認の負担が減ったか</h3><div class="measure-values"><strong>導入前に計測</strong></div><p>店舗の入力時間と本部の集計時間を、導入前後で記録します。</p></div><button type="button" class="button full-width" style="margin-top:16px" data-go="rollout">試験導入の進め方 →</button></section></div>`;
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
      <div class="rollout-bottom"><div><h3>最初の意思決定は、試す店舗と責任者。</h3><p>対象店舗・責任者・評価指標・許可されるデータを決め、導入範囲を具体化します。</p></div><button type="button" class="button primary" data-gooverview>全店舗の経営概況へ →</button></div>
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
    el.setAttribute('aria-label',`${scopeName()}の${state.metric==='revenue'?'売上':'営業利益'}推移、円換算。${points.map(p=>`${p.label} ${money(p[state.metric])}`).join('、')}。数値はデモ用。`);
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
      document.getElementById('tour-note').textContent=`金額は現地通貨 ${store.currency}。退会率 ${pct(s.previousChurnPercent)}% → ${pct(s.churnPercent)}%。未対応 ${s.pending}件。次は10月の会員一覧から、フォローの手順を確認します。`;
    }
    document.getElementById('tour-prev').disabled=state.step===0;
    document.getElementById('tour-next').textContent=state.step===tourSteps.length-1?'説明を終了 ✓':'次へ →';
  }
  function render() {
    if(chartObserver) chartObserver.disconnect();
    main.innerHTML=({intro:introduction,overview,stores,retention,actions,impact,rollout})[state.view]();
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
    else if(b.hasAttribute('data-go-retention')){selectRetentionScope(b.dataset.goRetention||'all');navigate('retention');}
    else if(b.dataset.retentionStore){selectRetentionScope(b.dataset.retentionStore);render();document.getElementById('retention-detail-title')?.focus();}
    else if(b.dataset.retentionCase&&retentionCases().some(item=>item.id===b.dataset.retentionCase)){state.retentionId=b.dataset.retentionCase;render();document.getElementById('retention-detail-title')?.focus();}
    else if(b.dataset.go)navigate(b.dataset.go);
    else if(b.hasAttribute('data-start-tour'))startTour();
    else if(b.dataset.country && (b.dataset.country==='all'||D.countries.some(country=>country.id===b.dataset.country))){state.country=b.dataset.country;render();}
    else if(b.dataset.store){state.store=b.dataset.store;navigate('stores');}
    else if(b.dataset.selectStore){state.store=b.dataset.selectStore;render();}
    else if(b.dataset.metric){state.metric=b.dataset.metric;render();}
    else if(b.hasAttribute('data-open-action'))openAction();
  });
  main.addEventListener('input',e=>{
    if(e.target.id==='retention-note'){document.getElementById('retention-note-count').textContent=e.target.value.length;return;}
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
    if(e.target.id==='retention-country') {
      selectRetentionScope(e.target.value);render();document.getElementById('retention-country').focus();return;
    }
    if(e.target.id==='retention-store') {
      selectRetentionScope(e.target.value==='all'?state.retentionCountry:e.target.value);render();document.getElementById('retention-store').focus();return;
    }
    if(e.target.id==='retention-status') {
      const closed=e.target.value==='closed';
      const outcome=document.getElementById('retention-outcome');
      outcome.disabled=!closed;outcome.required=closed;
      if(!closed)outcome.value='unknown';
      else if(outcome.value==='unknown')outcome.value='';
      document.getElementById('retention-outcome-help').textContent=closed?'確認できた結果を選んでください。連絡しただけでは、来館再開・継続意向の確認にはなりません。':'「対応完了」にする場合は、確認できた結果を選択してください。対応予定・連絡済みは「経過確認中」として扱います。';
      return;
    }
    if(e.target.id==='task-status'&&state.task&&['未着手','対応中','完了'].includes(e.target.value)){
      state.task.status=e.target.value;notify(`デモ内のタスクを「${state.task.status}」にしました。業績数値は変わりません。`);
    }
  });
  main.addEventListener('submit',e=>{
    if(e.target.id!=='retention-form')return;
    e.preventDefault();
    const form=e.target;
    if(!form.reportValidity())return;
    const status=form.elements.status.value;
    const entry={owner:form.elements.owner.value,due:form.elements.due.value,status,outcome:status==='closed'?form.elements.outcome.value:'unknown',note:form.elements.note.value};
    try {
      state.retentionRecords=R.saveRecord(state.retentionRecords,form.dataset.caseId,entry);
      render();
      document.getElementById('retention-detail-title')?.focus({preventScroll:true});
      notify('対応を記録しました。会員への送信は行っていません。');
    } catch {
      const feedback=document.getElementById('retention-error');
      feedback.textContent='記録できませんでした。担当者、10月14日〜12月31日の実在する期限、対応状況、240字以内のメモを確認してください。「対応完了」には確認結果の選択が必要です。';
      feedback.hidden=false;
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
    state.tour=true;state.step=0;state.country='all';state.store='B';selectRetentionScope('all');navigate(tourSteps[0].view);
  }
  document.getElementById('tour-start').addEventListener('click',startTour);
  function moveTour(delta) {
    const lastStep=tourSteps.length-1;
    if(delta>0&&state.step===lastStep){state.tour=false;updateTour();notify('説明を終了しました。各画面は引き続き自由に操作できます。');return;}
    state.step=Math.max(0,Math.min(lastStep,state.step+delta));
    state.country='all';
    if(tourSteps[state.step].view==='stores')state.store='B';
    if(tourSteps[state.step].view==='retention')selectRetentionScope('all');
    navigate(tourSteps[state.step].view);
  }
  document.getElementById('tour-prev').addEventListener('click',()=>moveTour(-1));
  document.getElementById('tour-next').addEventListener('click',()=>moveTour(1));
  document.getElementById('tour-close').addEventListener('click',()=>{state.tour=false;updateTour();});
  document.getElementById('reset-demo').addEventListener('click',()=>{
    state.task=null;state.people=10;state.fee=180;state.metric='revenue';state.country='all';state.store='B';state.tour=false;state.step=0;
    state.retentionRecords=R.initialRecords();state.retentionCountry='all';state.retentionStore='all';state.retentionId=R.cases[0].id;
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
