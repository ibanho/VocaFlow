/**
 * [Step 3] Free Dictionary API + Datamuse로 한글 뜻 매핑
 * PRD 9.6: ANTHROPIC 대신 무료 사전 API 사용
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, 'data');
const BASE = path.resolve(DATA_DIR, 'base_words.json');
const FREQ = path.resolve(DATA_DIR, 'frequency.json');
const OUT  = path.resolve(DATA_DIR, 'final_words.json');

interface BaseWord { word: string; difficulty: number; source: string; }
interface FinalWord extends BaseWord {
  meaning: string;
  pos: string;
  corpus_freq: number;
  definition_en?: string;
  phonetic?: string;
  synonyms?: string[];
}

// 내장 한국어 사전 (수능 핵심 단어)
const KO: Record<string,{m:string;p:string}> = {
  new:{m:'새로운',p:'adj'},home:{m:'가정, 집',p:'noun'},time:{m:'시간',p:'noun'},
  work:{m:'일하다',p:'verb'},people:{m:'사람들',p:'noun'},world:{m:'세계',p:'noun'},
  help:{m:'돕다',p:'verb'},get:{m:'얻다',p:'verb'},first:{m:'첫 번째의',p:'adj'},
  need:{m:'필요로 하다',p:'verb'},make:{m:'만들다',p:'verb'},find:{m:'찾다',p:'verb'},
  good:{m:'좋은',p:'adj'},look:{m:'보다',p:'verb'},year:{m:'년, 해',p:'noun'},
  day:{m:'날, 하루',p:'noun'},back:{m:'뒤로',p:'adv'},life:{m:'인생',p:'noun'},
  take:{m:'가져가다',p:'verb'},long:{m:'긴',p:'adj'},give:{m:'주다',p:'verb'},
  come:{m:'오다',p:'verb'},think:{m:'생각하다',p:'verb'},know:{m:'알다',p:'verb'},
  want:{m:'원하다',p:'verb'},tell:{m:'말하다',p:'verb'},keep:{m:'유지하다',p:'verb'},
  use:{m:'사용하다',p:'verb'},start:{m:'시작하다',p:'verb'},show:{m:'보여주다',p:'verb'},
  hear:{m:'듣다',p:'verb'},feel:{m:'느끼다',p:'verb'},leave:{m:'떠나다',p:'verb'},
  call:{m:'부르다',p:'verb'},run:{m:'달리다',p:'verb'},turn:{m:'돌다',p:'verb'},
  set:{m:'설정하다',p:'verb'},read:{m:'읽다',p:'verb'},pay:{m:'지불하다',p:'verb'},
  hope:{m:'희망하다',p:'verb'},live:{m:'살다',p:'verb'},believe:{m:'믿다',p:'verb'},
  hold:{m:'잡다',p:'verb'},bring:{m:'가져오다',p:'verb'},happen:{m:'일어나다',p:'verb'},
  write:{m:'쓰다',p:'verb'},provide:{m:'제공하다',p:'verb'},sit:{m:'앉다',p:'verb'},
  stand:{m:'서다',p:'verb'},lose:{m:'잃다',p:'verb'},meet:{m:'만나다',p:'verb'},
  include:{m:'포함하다',p:'verb'},continue:{m:'계속하다',p:'verb'},learn:{m:'배우다',p:'verb'},
  change:{m:'변하다',p:'verb'},lead:{m:'이끌다',p:'verb'},understand:{m:'이해하다',p:'verb'},
  watch:{m:'보다',p:'verb'},follow:{m:'따르다',p:'verb'},stop:{m:'멈추다',p:'verb'},
  create:{m:'창조하다',p:'verb'},speak:{m:'말하다',p:'verb'},allow:{m:'허락하다',p:'verb'},
  add:{m:'추가하다',p:'verb'},grow:{m:'자라다',p:'verb'},open:{m:'열다',p:'verb'},
  walk:{m:'걷다',p:'verb'},offer:{m:'제안하다',p:'verb'},remember:{m:'기억하다',p:'verb'},
  love:{m:'사랑하다',p:'verb'},consider:{m:'고려하다',p:'verb'},appear:{m:'나타나다',p:'verb'},
  buy:{m:'사다',p:'verb'},wait:{m:'기다리다',p:'verb'},serve:{m:'봉사하다',p:'verb'},
  die:{m:'죽다',p:'verb'},send:{m:'보내다',p:'verb'},expect:{m:'기대하다',p:'verb'},
  build:{m:'짓다',p:'verb'},stay:{m:'머무르다',p:'verb'},fall:{m:'떨어지다',p:'verb'},
  cut:{m:'자르다',p:'verb'},reach:{m:'도달하다',p:'verb'},kill:{m:'죽이다',p:'verb'},
  remain:{m:'남다',p:'verb'},suggest:{m:'제안하다',p:'verb'},raise:{m:'올리다',p:'verb'},
  pass:{m:'지나가다',p:'verb'},sell:{m:'팔다',p:'verb'},require:{m:'요구하다',p:'verb'},
  report:{m:'보고하다',p:'verb'},decide:{m:'결정하다',p:'verb'},pull:{m:'당기다',p:'verb'},
  develop:{m:'개발하다',p:'verb'},increase:{m:'증가하다',p:'verb'},reduce:{m:'줄이다',p:'verb'},
  produce:{m:'생산하다',p:'verb'},protect:{m:'보호하다',p:'verb'},improve:{m:'향상시키다',p:'verb'},
  involve:{m:'포함하다',p:'verb'},exist:{m:'존재하다',p:'verb'},determine:{m:'결정하다',p:'verb'},
  recognize:{m:'인식하다',p:'verb'},describe:{m:'묘사하다',p:'verb'},accept:{m:'받아들이다',p:'verb'},
  achieve:{m:'달성하다',p:'verb'},indicate:{m:'나타내다',p:'verb'},compare:{m:'비교하다',p:'verb'},
  respond:{m:'응답하다',p:'verb'},maintain:{m:'유지하다',p:'verb'},establish:{m:'설립하다',p:'verb'},
  identify:{m:'확인하다',p:'verb'},relate:{m:'관련시키다',p:'verb'},represent:{m:'대표하다',p:'verb'},
  claim:{m:'주장하다',p:'verb'},influence:{m:'영향을 미치다',p:'verb'},define:{m:'정의하다',p:'verb'},
  occur:{m:'발생하다',p:'verb'},express:{m:'표현하다',p:'verb'},reveal:{m:'드러내다',p:'verb'},
  encourage:{m:'격려하다',p:'verb'},assume:{m:'가정하다',p:'verb'},observe:{m:'관찰하다',p:'verb'},
  contribute:{m:'기여하다',p:'verb'},examine:{m:'조사하다',p:'verb'},approach:{m:'접근하다',p:'verb'},
  replace:{m:'대체하다',p:'verb'},communicate:{m:'의사소통하다',p:'verb'},obtain:{m:'얻다',p:'verb'},
  demonstrate:{m:'보여주다',p:'verb'},adapt:{m:'적응하다',p:'verb'},perceive:{m:'인식하다',p:'verb'},
  cooperate:{m:'협력하다',p:'verb'},overcome:{m:'극복하다',p:'verb'},emphasize:{m:'강조하다',p:'verb'},
  evaluate:{m:'평가하다',p:'verb'},illustrate:{m:'설명하다',p:'verb'},
  high:{m:'높은',p:'adj'},old:{m:'오래된',p:'adj'},big:{m:'큰',p:'adj'},
  small:{m:'작은',p:'adj'},large:{m:'큰, 넓은',p:'adj'},important:{m:'중요한',p:'adj'},
  young:{m:'젊은',p:'adj'},different:{m:'다른',p:'adj'},possible:{m:'가능한',p:'adj'},
  public:{m:'공공의',p:'adj'},great:{m:'위대한',p:'adj'},right:{m:'올바른',p:'adj'},
  strong:{m:'강한',p:'adj'},true:{m:'진정한',p:'adj'},full:{m:'가득 찬',p:'adj'},
  early:{m:'이른',p:'adj'},clear:{m:'명확한',p:'adj'},easy:{m:'쉬운',p:'adj'},
  ready:{m:'준비된',p:'adj'},simple:{m:'단순한',p:'adj'},sure:{m:'확신하는',p:'adj'},
  hard:{m:'어려운',p:'adj'},special:{m:'특별한',p:'adj'},difficult:{m:'어려운',p:'adj'},
  wrong:{m:'잘못된',p:'adj'},certain:{m:'확실한',p:'adj'},free:{m:'자유로운',p:'adj'},
  common:{m:'흔한',p:'adj'},social:{m:'사회의',p:'adj'},natural:{m:'자연의',p:'adj'},
  human:{m:'인간의',p:'adj'},political:{m:'정치의',p:'adj'},local:{m:'지역의',p:'adj'},
  real:{m:'실제의',p:'adj'},economic:{m:'경제의',p:'adj'},similar:{m:'비슷한',p:'adj'},
  general:{m:'일반적인',p:'adj'},available:{m:'이용 가능한',p:'adj'},
  significant:{m:'중요한',p:'adj'},private:{m:'사적인',p:'adj'},
  particular:{m:'특정한',p:'adj'},recent:{m:'최근의',p:'adj'},
  individual:{m:'개인의',p:'adj'},international:{m:'국제의',p:'adj'},
  whole:{m:'전체의',p:'adj'},traditional:{m:'전통적인',p:'adj'},
  present:{m:'현재의',p:'adj'},environmental:{m:'환경의',p:'adj'},
  cultural:{m:'문화의',p:'adj'},medical:{m:'의학의',p:'adj'},
  various:{m:'다양한',p:'adj'},physical:{m:'신체의',p:'adj'},
  appropriate:{m:'적절한',p:'adj'},fundamental:{m:'근본적인',p:'adj'},
  sophisticated:{m:'정교한',p:'adj'},controversial:{m:'논란이 많은',p:'adj'},
  comprehensive:{m:'포괄적인',p:'adj'},conscious:{m:'의식하는',p:'adj'},
  contemporary:{m:'현대의',p:'adj'},
  place:{m:'장소',p:'noun'},way:{m:'방법, 길',p:'noun'},number:{m:'숫자',p:'noun'},
  part:{m:'부분',p:'noun'},hand:{m:'손',p:'noun'},point:{m:'요점',p:'noun'},
  group:{m:'집단',p:'noun'},problem:{m:'문제',p:'noun'},fact:{m:'사실',p:'noun'},
  family:{m:'가족',p:'noun'},head:{m:'머리',p:'noun'},eye:{m:'눈',p:'noun'},
  side:{m:'옆, 면',p:'noun'},room:{m:'방',p:'noun'},water:{m:'물',p:'noun'},
  money:{m:'돈',p:'noun'},power:{m:'힘, 권력',p:'noun'},state:{m:'상태, 국가',p:'noun'},
  name:{m:'이름',p:'noun'},city:{m:'도시',p:'noun'},school:{m:'학교',p:'noun'},
  country:{m:'국가',p:'noun'},story:{m:'이야기',p:'noun'},government:{m:'정부',p:'noun'},
  company:{m:'회사',p:'noun'},area:{m:'지역',p:'noun'},case:{m:'경우',p:'noun'},
  question:{m:'질문',p:'noun'},word:{m:'단어',p:'noun'},system:{m:'체계',p:'noun'},
  body:{m:'몸',p:'noun'},friend:{m:'친구',p:'noun'},form:{m:'형태',p:'noun'},
  level:{m:'수준',p:'noun'},reason:{m:'이유',p:'noun'},mind:{m:'마음',p:'noun'},
  idea:{m:'생각',p:'noun'},house:{m:'집',p:'noun'},voice:{m:'목소리',p:'noun'},
  line:{m:'선, 줄',p:'noun'},face:{m:'얼굴',p:'noun'},food:{m:'음식',p:'noun'},
  mother:{m:'어머니',p:'noun'},door:{m:'문',p:'noun'},woman:{m:'여성',p:'noun'},
  kind:{m:'종류',p:'noun'},child:{m:'아이',p:'noun'},book:{m:'책',p:'noun'},
  car:{m:'자동차',p:'noun'},night:{m:'밤',p:'noun'},light:{m:'빛',p:'noun'},
  game:{m:'경기',p:'noun'},air:{m:'공기',p:'noun'},age:{m:'나이',p:'noun'},
  end:{m:'끝',p:'noun'},heart:{m:'심장',p:'noun'},earth:{m:'지구',p:'noun'},
  nature:{m:'자연',p:'noun'},society:{m:'사회',p:'noun'},research:{m:'연구',p:'noun'},
  education:{m:'교육',p:'noun'},experience:{m:'경험',p:'noun'},
  interest:{m:'관심',p:'noun'},information:{m:'정보',p:'noun'},
  community:{m:'공동체',p:'noun'},result:{m:'결과',p:'noun'},
  evidence:{m:'증거',p:'noun'},effect:{m:'효과',p:'noun'},value:{m:'가치',p:'noun'},
  development:{m:'발전',p:'noun'},health:{m:'건강',p:'noun'},law:{m:'법',p:'noun'},
  market:{m:'시장',p:'noun'},knowledge:{m:'지식',p:'noun'},
  situation:{m:'상황',p:'noun'},role:{m:'역할',p:'noun'},example:{m:'예시',p:'noun'},
  activity:{m:'활동',p:'noun'},technology:{m:'기술',p:'noun'},
  structure:{m:'구조',p:'noun'},environment:{m:'환경',p:'noun'},
  process:{m:'과정',p:'noun'},behavior:{m:'행동',p:'noun'},culture:{m:'문화',p:'noun'},
  theory:{m:'이론',p:'noun'},practice:{m:'연습',p:'noun'},science:{m:'과학',p:'noun'},
  industry:{m:'산업',p:'noun'},issue:{m:'문제, 쟁점',p:'noun'},
  relationship:{m:'관계',p:'noun'},resource:{m:'자원',p:'noun'},
  population:{m:'인구',p:'noun'},ability:{m:'능력',p:'noun'},
  material:{m:'재료',p:'noun'},condition:{m:'조건',p:'noun'},
  attention:{m:'주의',p:'noun'},language:{m:'언어',p:'noun'},
  species:{m:'종(種)',p:'noun'},circumstance:{m:'상황',p:'noun'},
  principle:{m:'원칙',p:'noun'},perspective:{m:'관점',p:'noun'},
  hypothesis:{m:'가설',p:'noun'},phenomenon:{m:'현상',p:'noun'},
  strategy:{m:'전략',p:'noun'},consequence:{m:'결과',p:'noun'},
  constraint:{m:'제약',p:'noun'},
  however:{m:'그러나',p:'adv'},always:{m:'항상',p:'adv'},never:{m:'결코 ~않다',p:'adv'},
  already:{m:'이미',p:'adv'},often:{m:'자주',p:'adv'},almost:{m:'거의',p:'adv'},
  quite:{m:'꽤',p:'adv'},perhaps:{m:'아마도',p:'adv'},really:{m:'정말로',p:'adv'},
  still:{m:'여전히',p:'adv'},especially:{m:'특히',p:'adv'},usually:{m:'보통',p:'adv'},
  actually:{m:'사실은',p:'adv'},certainly:{m:'확실히',p:'adv'},probably:{m:'아마',p:'adv'},
  suddenly:{m:'갑자기',p:'adv'},eventually:{m:'결국',p:'adv'},obviously:{m:'분명히',p:'adv'},
  recently:{m:'최근에',p:'adv'},finally:{m:'마침내',p:'adv'},directly:{m:'직접적으로',p:'adv'},
  instead:{m:'대신에',p:'adv'},indeed:{m:'정말로',p:'adv'},therefore:{m:'그러므로',p:'adv'},
  otherwise:{m:'그렇지 않으면',p:'adv'},thus:{m:'따라서',p:'adv'},
  merely:{m:'단지',p:'adv'},hardly:{m:'거의 ~않다',p:'adv'},rather:{m:'오히려',p:'adv'},
  despite:{m:'~에도 불구하고',p:'prep'},although:{m:'비록 ~이지만',p:'conj'},
  whether:{m:'~인지 아닌지',p:'conj'},
  abandon:{m:'버리다, 포기하다',p:'verb'},absolute:{m:'절대적인',p:'adj'},
  absorb:{m:'흡수하다',p:'verb'},abstract:{m:'추상적인',p:'adj'},
  abundant:{m:'풍부한',p:'adj'},academic:{m:'학업의',p:'adj'},
  accelerate:{m:'가속하다',p:'verb'},accommodate:{m:'수용하다',p:'verb'},
  accomplish:{m:'성취하다',p:'verb'},accurate:{m:'정확한',p:'adj'},
  accuse:{m:'고발하다',p:'verb'},acquire:{m:'습득하다',p:'verb'},
  adequate:{m:'적당한',p:'adj'},adjust:{m:'조정하다',p:'verb'},
  admire:{m:'존경하다',p:'verb'},admit:{m:'인정하다',p:'verb'},
  adopt:{m:'채택하다',p:'verb'},advance:{m:'전진하다',p:'verb'},
  advantage:{m:'이점',p:'noun'},advocate:{m:'옹호하다',p:'verb'},
  affect:{m:'영향을 미치다',p:'verb'},afford:{m:'여유가 있다',p:'verb'},
  aggressive:{m:'공격적인',p:'adj'},agriculture:{m:'농업',p:'noun'},
  allocate:{m:'할당하다',p:'verb'},alter:{m:'바꾸다',p:'verb'},
  alternative:{m:'대안',p:'noun'},ambition:{m:'야망',p:'noun'},
  analyze:{m:'분석하다',p:'verb'},ancient:{m:'고대의',p:'adj'},
  announce:{m:'발표하다',p:'verb'},annual:{m:'매년의',p:'adj'},
  anticipate:{m:'예상하다',p:'verb'},anxiety:{m:'불안',p:'noun'},
  apologize:{m:'사과하다',p:'verb'},apparent:{m:'명백한',p:'adj'},
  appeal:{m:'호소하다',p:'verb'},apply:{m:'적용하다',p:'verb'},
  appreciate:{m:'감사하다',p:'verb'},
};

async function fetchDictAPI(word: string): Promise<{def:string;pos:string;phonetic:string}|null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) return null;
    const data = await res.json() as any[];
    const entry = data[0];
    const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';
    const meaning = entry.meanings?.[0];
    const def = meaning?.definitions?.[0]?.definition || '';
    const pos = meaning?.partOfSpeech || 'noun';
    return { def, pos, phonetic };
  } catch { return null; }
}

async function fetchSynonyms(word: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.datamuse.com/words?rel_syn=${word}&max=5`);
    if (!res.ok) return [];
    const data = await res.json() as Array<{word:string}>;
    return data.map(d => d.word);
  } catch { return []; }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('[3] Loading data...');
  const baseWords: BaseWord[] = JSON.parse(fs.readFileSync(BASE, 'utf-8'));
  let freqData: Record<string,number> = {};
  if (fs.existsSync(FREQ)) freqData = JSON.parse(fs.readFileSync(FREQ, 'utf-8'));

  const finalWords: FinalWord[] = baseWords.map(bw => {
    const ko = KO[bw.word];
    return {
      ...bw,
      meaning: ko?.m || '',
      pos: ko?.p || 'noun',
      corpus_freq: freqData[bw.word] || 0,
    };
  });

  // Free Dictionary API로 미번역 단어 보강
  const missing = finalWords.filter(w => !w.meaning);
  console.log(`[3] ${finalWords.length} total, ${finalWords.length - missing.length} have Korean, ${missing.length} need API lookup`);

  let apiCount = 0;
  for (const fw of missing) {
    const dict = await fetchDictAPI(fw.word);
    if (dict) {
      fw.definition_en = dict.def;
      fw.pos = dict.pos;
      fw.phonetic = dict.phonetic;
      fw.meaning = dict.def.slice(0, 60); // 영영 정의를 임시 뜻으로 사용
      apiCount++;
    }
    const syns = await fetchSynonyms(fw.word);
    if (syns.length) fw.synonyms = syns;

    if (apiCount % 100 === 0 && apiCount > 0) console.log(`  ...${apiCount} words enriched`);
    await sleep(100); // rate limit 존중
  }
  console.log(`[3] API enriched ${apiCount} words`);

  // 여전히 빈 단어 제거
  const valid = finalWords.filter(w => w.meaning);
  valid.sort((a,b) => a.difficulty - b.difficulty || b.corpus_freq - a.corpus_freq);

  fs.writeFileSync(OUT, JSON.stringify(valid, null, 2));
  console.log(`[3] Saved ${valid.length} words → ${OUT}`);
}

main().catch(console.error);
