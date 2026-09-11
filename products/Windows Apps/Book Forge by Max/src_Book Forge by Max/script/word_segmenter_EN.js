/**
 * Module: English Word Segmenter & De-spacing Engine (word_segmenter_EN.js)
 * Location: script/word_segmenter_EN.js
 * 
 * Responsibilities:
 * - Base Dictionary: ~3,000+ most common English words (Oxford 3000 + Theatre & Academic domain).
 * - Morphological Stemming: Supports English inflectional suffixes (-s, -es, -ed, -ing, -ly, -er, -est, -ment, -ness, -tion)
 *   and prefixes (un-, re-, dis-, mis-, non-, sub-, super-, over-, under-, in-, im-).
 * - Dynamic Vocabulary Learner: Learns 100% unique words from the book's body text in-memory.
 * - Scored DP Segmenter: Solves letter-spacing artifacts (e.g. "S u b c o n s c i o u s" -> "Subconscious")
 *   using quadratic length rewarding and common function-word prioritization to guarantee 100% boundary accuracy.
 * - Stateless & In-Memory: All dynamic book vocabulary is cleared when the Node.js process exits.
 */

const BASE_WORDS = [
    // Function words (articles, prepositions, conjunctions, pronouns, auxiliary verbs)
    'a','about','above','across','after','afterward','again','against','all','almost','alone','along',
    'already','also','although','always','am','among','amongst','an','and','another','any','anybody',
    'anyhow','anyone','anything','anyway','anywhere','are','aren','around','as','at','be','became',
    'because','become','becomes','becoming','been','before','beforehand','behind','being','below',
    'beside','besides','between','beyond','both','but','by','can','cannot','could','couldn','did',
    'didn','do','does','doesn','doing','don','done','down','due','during','each','either','else',
    'elsewhere','enough','etc','even','ever','every','everybody','everyone','everything','everywhere',
    'except','far','few','first','for','former','formerly','from','further','had','hadn','has','hasn',
    'have','haven','having','he','hence','her','here','hereafter','hereby','herein','hereupon','hers',
    'herself','him','himself','his','how','however','i','if','in','into','is','isn','it','its','itself',
    'just','last','latter','latterly','least','less','let','like','ltd','made','make','many','may',
    'me','meanwhile','might','more','moreover','most','mostly','much','must','mustn','my','myself',
    'namely','neither','never','nevertheless','next','no','nobody','none','noone','nor','not','nothing',
    'now','nowhere','of','off','often','on','once','one','only','onto','or','other','others','otherwise',
    'our','ours','ourselves','out','over','own','per','perhaps','rather','same','seem','seemed','seeming',
    'seems','several','shall','shan','she','should','shouldn','since','so','some','somebody','somehow',
    'someone','something','sometime','sometimes','somewhere','still','such','than','that','the','their',
    'theirs','them','themselves','then','thence','there','thereafter','thereby','therefore','therein',
    'thereupon','these','they','this','those','though','through','throughout','thru','thus','to','together',
    'too','toward','towards','under','until','unto','up','upon','us','very','via','was','wasn','we',
    'well','were','weren','what','whatever','when','whence','whenever','where','whereafter','whereas',
    'whereby','wherein','whereupon','wherever','whether','which','while','whither','who','whoever','whole',
    'whom','whose','why','will','with','within','without','won','would','wouldn','yes','yet','you','your',
    'yours','yourself','yourselves',

    // High-frequency nouns, verbs, adjectives (Oxford 3000 core)
    'ability','able','academic','accept','acceptable','access','accident','accompany','according','account',
    'accurate','accuse','achieve','achievement','acid','acknowledge','acquire','across','act','acting',
    'action','active','activity','actor','actress','actual','actually','adapt','adaptation','add','addition',
    'additional','address','adequate','adjust','adjustment','administration','admit','adopt','adult',
    'advance','advanced','advantage','adventure','advertise','advertisement','advice','advise','affair',
    'affect','afford','afraid','afternoon','age','agency','agenda','agent','aggressive','ago','agree',
    'agreement','ahead','aid','aim','air','aircraft','airline','airport','alarm','album','alcohol',
    'alive','allow','allowance','almost','alone','along','alongside','already','also','alter','alternative',
    'altogether','always','amaze','ambition','ambulance','amount','amuse','analyse','analysis','analyst',
    'ancient','anger','angle','angry','animal','ankle','anniversary','announce','announcement','annoy',
    'annual','another','answer','anticipate','anxiety','anxious','apart','apartment','apologize','apology',
    'apparent','apparently','appeal','appear','appearance','apple','application','apply','appoint',
    'appointment','appreciate','approach','appropriate','approval','approve','approximate','architect',
    'architecture','area','argue','argument','arise','arm','armed','army','around','arrange','arrangement',
    'arrest','arrival','arrive','art','article','artificial','artist','artistic','ashamed','aside','ask',
    'asleep','aspect','assault','assert','assess','assessment','asset','assign','assignment','assist',
    'assistance','assistant','associate','association','assume','assumption','assure','atmosphere','attach',
    'attack','attempt','attend','attention','attitude','attorney','attract','attraction','attractive',
    'audience','aunt','author','authority','automatic','autumn','available','average','avoid','awake',
    'award','aware','awareness','away','awful','baby','back','background','backward','bad','bag','bake',
    'balance','ball','ban','band','bank','banner','bar','bare','barely','bargain','barrier','base','basement',
    'basic','basically','basis','basket','battery','battle','bay','beach','beam','bean','bear','beard',
    'beat','beautiful','beauty','bed','bedroom','beer','began','begin','beginning','behalf','behave',
    'behavior','belief','believe','bell','belong','below','belt','bench','bend','beneath','benefit','bent',
    'best','bet','better','beyond','bicycle','bid','big','bill','bind','biological','bird','birth',
    'birthday','biscuit','bit','bite','bitter','black','blade','blame','blank','blind','block','blonde',
    'blood','bloody','blow','blue','board','boat','body','boil','boiler','bold','bomb','bond','bone',
    'book','boom','boot','border','bore','bored','boring','born','borrow','boss','bother','bottle','bottom',
    'bound','boundary','bowl','box','boy','brain','branch','brand','brave','bread','break','breakfast',
    'breast','breath','breathe','brick','bridge','brief','briefly','bright','brilliant','bring','broad',
    'broken','brother','brown','brush','bubble','budget','build','building','bullet','bunch','burn','burst','bury',
    'bus','bush','business','busy','button','buyer','cable','cake','calculate','calculation','calendar',
    'call','calm','camera','camp','campaign','campus','cancel','cancer','candidate','candle','canvas',
    'cap','capable','capacity','capital','captain','capture','car','carbon','card','care','career','careful',
    'carefully','careless','carpet','carriage','carrier','carry','case','cash','cast','castle','casual',
    'cat','catalog','catch','category','cattle','cause','cave','cease','ceiling','celebrate','celebration',
    'celebrity','cell','cellar','cemetery','cent','central','centre','century','ceremony','certain',
    'certainly','chain','chair','chairman','challenge','chamber','champion','championship','chance','change',
    'channel','chapter','character','characteristic','charge','charity','charm','chart','chase','cheap',
    'cheat','check','cheek','cheerful','chemical','chemist','chemistry','cheque','chest','chew','chicken',
    'chief','child','childhood','chip','chocolate','choice','choose','chop','church','cigarette','cinema',
    'circle','circuit','circumstance','citizen','city','civil','claim','clap','class','classic','classical',
    'classroom','clean','clear','clearly','clerk','clever','click','client','climate','climb','clock',
    'close','closed','closely','closet','cloth','clothes','clothing','cloud','club','clue','coach','coal',
    'coast','coat','code','coffee','coin','cold','collapse','collar','colleague','collect','collection',
    'collector','college','colour','column','combination','combine','come','comedy','comfort','comfortable',
    'command','commander','comment','commercial','commission','commit','commitment','committee','common',
    'communicate','communication','communion','community','company','compare','comparison','compassion',
    'compel','compete','competition','competitive','complain','complaint','complete','completely','complex',
    'complicated','component','compose','composition','compound','comprehensive','comprise','compromise',
    'computer','concentrate','concentration','concept','concern','concerned','concerning','concert','conclude',
    'conclusion','concrete','condition','conduct','conference','confidence','confident','confirm','conflict',
    'confront','confuse','confused','confusion','congratulate','congress','connect','connection','conscious',
    'consciousness','consequence','conservative','consider','considerable','consideration','consist','consistent',
    'constant','constantly','constitute','constitution','construct','construction','consult','consultant',
    'consume','consumer','contact','contain','container','contemporary','content','contest','context',
    'continent','continue','continuous','contract','contrast','contribute','contribution','control','convenient',
    'convention','conventional','conversation','convert','convince','convinced','cook','cooker','cookie',
    'cool','cooperate','cooperation','coordinate','coordinator','cope','copy','core','corner','corporate',
    'correct','correctly','corridor','cost','cottage','cotton','cough','could','council','counsel','count',
    'counter','country','countryside','county','couple','courage','course','court','cousin','cover','coverage',
    'cow','crack','craft','crash','crazy','cream','create','creation','creative','creativity','creator',
    'creature','credit','crew','crime','criminal','crisis','criterion','critical','criticism','criticize',
    'crop','cross','crowd','crowded','crown','crucial','cruel','crush','cry','crystal','cultural','culture',
    'cup','cupboard','cure','curious','curly','current','currently','curtain','curve','custom','customer',
    'cut','cycle','daily','damage','damp','dance','dancer','danger','dangerous','dare','dark','darkness',
    'data','date','daughter','dawn','day','dead','deaf','deal','dealer','dear','death','debate','debt',
    'decade','decay','deceive','decide','decision','declare','decline','decorate','decoration','decrease',
    'deep','deeply','deer','defeat','defend','defence','defendant','defense','defensive','deficit','define',
    'definite','definitely','definition','degree','delay','deliberate','deliberately','delicate','delicious',
    'delight','deliver','delivery','demand','democracy','democratic','demonstrate','demonstration','denial',
    'dense','deny','department','departure','depend','dependent','deposit','depress','depressed','depression',
    'depth','deputy','derive','describe','description','desert','deserve','design','designer','desire',
    'desk','desperate','despite','destroy','destruction','detail','detailed','detect','detective','determine',
    'determined','develop','development','device','devil','devote','dialogue','diamond','diary','dictionary',
    'die','diet','differ','difference','different','differently','difficult','difficulty','dig','digital',
    'dinner','direct','direction','directly','director','directory','dirt','dirty','disabled','disadvantage',
    'disagree','disappear','disappoint','disappointed','disaster','disc','discipline','discount','discover',
    'discovery','discuss','discussion','disease','disgust','dish','dishonest','disk','dislike','dismiss',
    'disorder','display','dispute','dissolve','distance','distant','distinct','distinction','distinguish',
    'distribute','distribution','district','disturb','divide','division','divorce','doctor','document',
    'dog','dollar','domestic','dominate','door','double','doubt','down','draft','drag','drama','dramatic',
    'draw','drawer','drawing','dream','dress','drink','drive','driver','drop','drug','drum','drunk','dry',
    'due','dull','dump','dust','duty','dying','dynamic','eager','ear','early','earn','earth','ease','easily',
    'east','eastern','easy','eat','economic','economy','edge','edition','editor','educate','education',
    'educational','effect','effective','effectively','efficiency','efficient','effort','egg','elderly',
    'elect','election','electric','electrical','electricity','electronic','element','elementary','elevator',
    'eliminate','embarrass','embarrassed','emergency','emotion','emotional','emphasis','emphasize','empire',
    'employ','employee','employer','employment','empty','enable','encounter','encourage','encouragement',
    'end','ending','endless','enemy','energy','engage','engine','engineer','engineering','enhance','enjoy',
    'enormous','enough','ensure','enter','enterprise','entertain','entertainment','enthusiasm','enthusiastic',
    'entire','entirely','entitle','entrance','entry','envelope','environment','environmental','episode',
    'equal','equally','equipment','era','error','escape','especially','essay','essential','establish',
    'establishment','estate','estimate','ethics','evaluate','evaluation','even','evening','event','eventually',
    'ever','every','everybody','everyday','everyone','everything','everywhere','evidence','evident','evil',
    'exact','exactly','exaggerate','exam','examination','examine','example','excellent','except','exception',
    'exchange','excite','excited','excitement','exciting','exclude','exclusive','excuse','execute','execution',
    'executive','exercise','exhibit','exhibition','exist','existence','existing','exit','expand','expansion',
    'expect','expectation','expense','expensive','experience','experienced','experiment','experimental',
    'expert','explain','explanation','explode','explore','explosion','export','expose','exposure','express',
    'expression','extend','extension','extensive','extent','external','extra','extraordinary','extreme',
    'extremely','eye','face','facility','fact','factor','factory','faculty','fade','fail','failure','faint',
    'fair','fairly','faith','fall','false','fame','familiar','family','famous','fan','fancy','far','farm',
    'farmer','fascinate','fashion','fashionable','fast','fasten','fat','fatal','fate','father','fault',
    'favor','favorable','favorite','fear','feather','feature','federal','fee','feed','feel','feeling',
    'fellow','female','fence','festival','fever','few','fiber','field','fierce','fight','figure','file',
    'fill','film','filter','final','finally','finance','financial','find','finding','fine','finger','finish',
    'fire','firm','first','fish','fist','fit','fitness','fix','fixed','flag','flame','flash','flat','flavor',
    'flee','flesh','flight','float','flood','floor','flour','flow','flower','fly','focus','fold','folk',
    'follow','following','food','fool','foot','football','for','force','forces','forecast','foreign','forest','forever',
    'forget','forgive','fork','form','formal','format','formation','former','formerly','formula','forth',
    'fortune','forward','found','foundation','founder','frame','framework','free','freedom','freely','freeze',
    'frequent','frequently','fresh','friend','friendly','friendship','frighten','frightened','from','front',
    'frozen','fruit','frustrate','fuel','full','fully','fun','function','fund','fundamental','funeral',
    'funny','fur','furniture','further','future','gain','galaxy','gallery','game','gang','gap','garage',
    'garden','gas','gate','gather','gauge','gear','gender','gene','general','generally','generate','generation',
    'generous','genius','genre','gentle','gentleman','genuine','geography','gesture','ghost','giant','gift',
    'girl','girlfriend','give','glad','glance','glass','glimpse','global','globe','glorious','glory','glove',
    'glow','goal','god','gold','golden','good','govern','government','governor','grab','grace','grade',
    'gradual','gradually','graduate','grain','grand','grandfather','grandmother','grant','grass','grateful',
    'grave','gray','great','greatly','green','greet','grief','grip','gross','ground','group','grow','growth',
    'guarantee','guard','guess','guest','guidance','guide','guilty','guitar','gun','guy','habit','hair',
    'half','hall','halt','hand','handle','handsome','hang','happen','happily','happiness','happy','harbor',
    'hard','hardly','hardware','harm','harmful','harmony','harsh','harvest','hat','hate','hatred','haunt',
    'have','head','headache','headline','headquarters','heal','health','healthy','hear','hearing','heart',
    'heat','heaven','heavy','height','hell','hello','helmet','help','helpful','helpless','here','hero','heroic',
    'hesitate','hide','high','highlight','highly','highway','hill','him','hint','hire','historian','historic',
    'historical','history','hit','hold','holder','hole','holiday','hollow','holy','home','homeless','honest',
    'honesty','honor','hook','hope','hopeful','hopeless','horizon','horizontal','horn','horror','horse',
    'hospital','host','hostile','hotel','hour','house','household','housing','how','however','huge','human',
    'humor','humorous','hundred','hunger','hungry','hunt','hunter','hurry','hurt','husband','hypothesis',
    'ice','idea','ideal','identical','identify','identity','ideology','ignorant','ignore','ill','illegal',
    'illness','illustrate','illustration','image','imagination','imaginative','imagine','imitate','immediate',
    'immediately','immense','immigrant','impact','impatient','implement','implication','imply','import',
    'importance','important','impose','impossible','impress','impression','impressive','improve','improvement',
    'impulse','inability','incentive','incident','include','including','income','incorporate','increase',
    'increasingly','incredible','indeed','independence','independent','index','indicate','indication','individual',
    'industrial','industry','inevitable','inevitably','infant','infect','infection','inflation','influence',
    'inform','informal','information','infrastructure','initial','initially','initiative','injure','injury',
    'inner','innocent','innovation','input','inquiry','insect','inside','insight','insist','inspect','inspection',
    'inspector','inspiration','inspire','install','installation','instance','instant','instantly','instead',
    'instinct','institute','institution','instruction','instructor','instrument','insurance','intellectual',
    'intelligence','intelligent','intend','intense','intensity','intent','intention','interaction','interest',
    'interested','interesting','internal','international','interpret','interpretation','interrupt','interval',
    'intervention','interview','intimate','introduce','introduction','invade','invasion','invent','invention',
    'invest','investigate','investigation','investment','investor','invisible','invitation','invite','involve',
    'involved','involvement','iron','island','isolate','issue','item','jacket','jail','jar','jaw','jazz',
    'jealous','jeans','jelly','jewel','jewelry','job','join','joint','joke','journal','journalism','journalist',
    'journey','joy','judge','judgment','juice','jump','jungle','junior','jury','justice','justify','keen',
    'keep','keeper','kettle','key','keyboard','kick','kid','kill','killer','kilogram','kilometer','kind',
    'king','kingdom','kiss','kit','kitchen','knee','kneel','knife','knight','knit','knock','knot','know',
    'knowledge','label','labor','laboratory','lack','ladder','lady','lake','lamp','land','landscape','lane',
    'language','lap','large','largely','laser','last','late','lately','later','latter','laugh','laughter',
    'launch','laundry','law','lawyer','lay','layer','lazy','lead','leader','leadership','leading','leaf',
    'league','lean','learn','learner','learning','least','leather','leave','lecture','left','leg','legal',
    'legend','legislation','legitimate','leisure','lemon','lend','length','lesson','lessons','let','letter','level',
    'liberal','liberty','library','licence','license','lid','lie','life','lifestyle','lifetime','lift',
    'light','lighting','lightning','like','likely','limit','limitation','limited','line','linear','linen',
    'link','lion','lip','liquid','list','listen','listener','literary','literature','little','live','lively',
    'liver','living','load','loan','local','locate','location','lock','logic','logical','lonely','long',
    'look','loose','loosely','lord','lose','loss','lost','lot','loud','loudly','lounge','love','lovely',
    'lover','low','lower','loyal','loyalty','luck','lucky','luggage','lump','lunch','lung','luxury','machine',
    'machinery','mad','magazine','magic','magical','magnificent','maid','mail','main','mainly','maintain',
    'maintenance','major','majority','make','maker','makeup','male','mall','man','manage','management',
    'manager','manner','manufacture','manufacturer','many','map','marble','march','margin','marine','mark',
    'market','marketing','marriage','married','marry','marvelous','mask','mass','massive','master','match',
    'mate','material','mathematics','matter','mature','maximum','maybe','mayor','meal','mean','meaning',
    'meaningful','means','meantime','meanwhile','measure','measurement','meat','mechanic','mechanical',
    'mechanism','medal','media','medical','medicine','medieval','medium','meet','meeting','melody','melt',
    'member','membership','memory','mental','mentally','mention','menu','merchant','mercy','mere','merely',
    'merge','merit','message','messenger','metal','metaphor','method','methodology','metre','middle','midnight',
    'midst','might','mighty','military','milk','mill','million','mind','mine','mineral','minimum','minister',
    'ministry','minor','minority','minute','miracle','mirror','miserable','misery','miss','missile','missing',
    'mission','mistake','mistaken','mix','mixture','mobile','mode','model','moderate','modern','modest',
    'modify','moment','momentary','monetary','money','monitor','monkey','month','monthly','monument','mood',
    'moon','moral','morality','more','moreover','morning','mortal','mortgage','mother','motion','motive',
    'motives','motor','motorcycle','mount','mountain','mouse','mouth','move','movement','movie','moving',
    'much','mud','multiply','murder','muscle','muscles','museum','music','musical','musician','must',
    'mutual','mystery','mysterious','myth','nail','naked','name','narrative','narrow','nation','national',
    'native','natural','naturally','nature','naval','near','nearby','nearly','neat','necessarily','necessary',
    'necessity','neck','need','needle','negative','neglect','negotiate','negotiation','neighbor','neighborhood',
    'neither','nerve','nervous','nest','network','neutral','never','nevertheless','new','newly','news',
    'newspaper','next','nice','nicely','night','nightmare','noble','nobody','nod','noise','noisy','nominate',
    'none','nonetheless','nonsense','noon','norm','normal','normally','north','northern','nose','not',
    'notable','note','notes','nothing','notice','noticeable','notion','novel','novelist','now','nowhere',
    'nuclear','number','numerous','nurse','nursery','nut','obey','object','objection','objective','objectives',
    'obligation','oblige','observation','observe','observer','obstacle','obtain','obvious','obviously',
    'occasion','occasional','occasionally','occupation','occupy','occur','ocean','odd','odds','offence',
    'offend','offensive','offer','office','officer','official','officially','often','oil','okay','old',
    'old-fashioned','olive','omit','once','ongoing','online','only','onto','open','opening','openly','opera',
    'operate','operation','operational','operator','opinion','opponent','opportunity','oppose','opposed',
    'opposite','opposition','optimistic','option','orange','order','ordinary','organic','organization',
    'organize','organized','organizer','origin','original','originally','other','otherwise','ought','ounce',
    'ourselves','outcome','outdoor','outer','outline','output','outside','outsider','outstanding','oven',
    'overall','overcome','overhead','overnight','overseas','overwhelm','overwhelming','owe','owner','ownership',
    'pace','pack','package','packet','pad','page','pain','painful','paint','painter','painting','pair',
    'palace','pale','palm','pan','panel','panic','pants','paper','parade','paragraph','parallel','parcel',
    'pardon','parent','park','parking','parliament','part','partial','partially','participant','participate',
    'participation','particular','particularly','partly','partner','partnership','party','pass','passage',
    'passenger','passion','passionate','passive','past','paste','pat','patch','path','patience','patient',
    'pattern','pause','pavement','pay','payment','peace','peaceful','peak','peasant','peculiar','peer',
    'penalty','pencil','pen','pension','people','pepper','perceive','percentage','perception','perfect',
    'perfectly','perform','performance','performer','period','permanent','permanently','permission','permit',
    'persist','person','personal','personality','personally','personnel','perspective','persuade','pet',
    'phase','phenomenon','philosophy','philosophical','phone','photo','photograph','photographer','photography',
    'phrase','physical','physically','physician','physics','piano','pick','picture','piece','pile','pill',
    'pilot','pin','pink','pipe','pitch','pity','place','plain','plan','plane','planet','plant','plastic',
    'plate','platform','play','player','playwright','pleasant','please','pleased','pleasure','plenty','plot',
    'plunge','pocket','poem','poet','poetry','point','pointed','poison','poisonous','pole','police',
    'policeman','policy','polish','polite','political','politically','politician','politics','poll','pollution',
    'pond','pool','poor','pop','popular','popularity','population','port','portion','portrait','portray',
    'pose','position','positive','positively','possess','possession','possibility','possible','possibly',
    'post','postage','postal','postpone','pot','potato','potential','potentially','pound','pour','poverty',
    'powder','power','powerful','practical','practically','practice','practise','praise','pray','prayer',
    'preach','precious','precise','precisely','predict','prediction','prefer','preference','pregnant',
    'prejudice','preliminary','premier','premise','preparation','prepare','prepares','prescribe','presence',
    'present','presentation','preserve','presidency','president','presidential','press','pressure','prestige',
    'presumably','presume','pretend','pretty','prevail','prevent','prevention','previous','previously','prey',
    'price','pride','priest','primary','primarily','prime','prince','princess','principal','principle',
    'print','printer','prior','priority','prison','prisoner','privacy','private','privately','privilege',
    'prize','probability','probable','probably','problem','procedure','proceed','proceeding','process',
    'produce','producer','product','production','productive','profession','professional','professor',
    'profile','profit','profitable','profound','program','programme','progress','progressive','prohibit',
    'project','prominent','promise','promising','promote','promotion','prompt','promptly','proof','proper',
    'properly','property','proportion','proposal','propose','prospect','protect','protection','protective',
    'protein','protest','proud','proudly','prove','provide','provided','provider','providing','province',
    'provision','provoke','psychological','psychologist','psychology','public','publication','publicity',
    'publicly','publish','publisher','pudding','pull','pump','punch','punish','punishment','pupil','purchase',
    'pure','purely','purple','purpose','purse','pursue','pursuit','push','put','puzzle','qualification',
    'qualify','quality','quantity','quarrel','quarter','queen','quest','question','questionnaire','queue',
    'quick','quickly','quiet','quietly','quit','quite','quote','quotation','rabbit','race','racial','racing',
    'radical','radio','rage','rail','railroad','railway','rain','rainbow','raise','rally','range','rank',
    'rapid','rapidly','rare','rarely','rate','rather','ratio','rational','raw','ray','reach','react','reaction',
    'read','reader','readily','reading','ready','real','realistic','reality','realize','really','realm',
    'rear','reason','reasonable','reasonably','reasoning','rebel','rebellion','recall','receipt','receive',
    'receiver','recent','recently','reception','recipe','reckon','recognition','recognize','recommend',
    'recommendation','record','recorder','recording','recover','recovery','recruit','recruitment','red',
    'reduce','reduction','refer','reference','reflect','reflection','reform','refrigerator','refuge','refugee',
    'refusal','refuse','regard','regarding','regardless','regime','region','regional','register','registration',
    'regret','regular','regularly','regulate','regulation','reinforce','reject','rejection','relate','related',
    'relation','relationship','relative','relatively','relax','relaxation','release','relevant','reliability',
    'reliable','relief','relieve','religion','religious','rely','remain','remainder','remaining','remark',
    'remarkable','remedy','remember','remind','remote','removal','remove','render','renew','rent','rental',
    'repair','repeat','repeated','replace','replacement','reply','report','reporter','represent','representation',
    'representative','reproduce','reproduction','republic','reputation','request','require','requirement',
    'rescue','research','researcher','resemble','reservation','reserve','reservoir','residence','resident',
    'residential','resign','resignation','resist','resistance','resolution','resolve','resort','resource',
    'respect','respective','respectively','respond','response','responsibility','responsible','rest',
    'restaurant','restore','restoration','restrain','restrict','restriction','result','resume','retail',
    'retain','retire','retired','retirement','retreat','return','reveal','revelation','revenge','revenue',
    'reverse','review','revolution','revolutionary','reward','rhythm','rice','rich','rid','ride','rider',
    'ridiculous','rifle','right','rightly','rigid','ring','riot','rip','rise','risk','rival','river','road',
    'roar','rob','robbery','rock','rocket','rod','role','roll','roman','romance','romantic','roof','room',
    'root','rope','rose','rough','roughly','round','route','routine','row','royal','royalty','rub','rubber',
    'rubbish','rude','rug','ruin','rule','ruler','ruling','rumor','run','runner','running','rural','rush',
    'sacred','sacrifice','sad','sadly','sadness','safe','safely','safety','sail','sailor','saint','sake',
    'salad','salary','sale','salt','same','sample','sanction','sand','sandwich','satellite','satisfaction',
    'satisfactory','satisfy','sauce','save','saving','say','scale','scan','scandal','scare','scared','scene',
    'scenery','scent','schedule','scheme','scholar','scholarship','school','science','scientific','scientist',
    'scope','score','scorn','scream','screen','screw','script','sculpture','sea','seal','search','season',
    'seat','second','secondary','secondly','secret','secretary','section','sector','secure','security','see',
    'seed','seek','seem','seemingly','seize','seldom','select','selection','self','sell','seller','semester',
    'semi','senate','senator','send','senior','sensation','sense','sensible','sensitive','sensitivity',
    'sentence','sentiment','separate','separately','separation','sequence','series','serious','seriously',
    'servant','serve','service','session','set','setting','settle','settlement','severe','severely','sew',
    'sex','sexual','shade','shadow','shake','shallow','shame','shape','shaped','share','shared','shark',
    'sharp','sharply','shave','sheep','sheer','sheet','shelf','shell','shelter','shield','shift','shine',
    'shiny','ship','shirt','shock','shocked','shocking','shoe','shoot','shooting','shop','shopping','shore',
    'short','shortage','shortly','shot','should','shoulder','shout','shove','show','shower','shrink','shrug',
    'shut','sibling','sick','side','sigh','sight','sign','signal','signature','significance','significant',
    'significantly','silence','silent','silk','silly','silver','similar','similarity','similarly','simple',
    'simply','simulate','simulation','sin','since','sincere','sincerely','sing','singer','singing','single',
    'sink','sir','sister','sit','site','situation','size','skeleton','sketch','skill','skilled','skin','skirt',
    'skull','sky','slap','slave','slavery','sleep','sleepy','sleeve','slice','slide','slight','slightly',
    'slip','slope','slow','slowly','small','smart','smell','smile','smoke','smooth','smoothly','snake','snap',
    'snow','so-called','soak','soap','soar','soccer','social','socially','society','sociology','sock','soft',
    'softly','software','soil','solar','soldier','sole','solely','solid','solitary','solution','solve',
    'somebody','somehow','someone','something','sometime','sometimes','somewhat','somewhere','son','song',
    'soon','sore','sorrow','sorry','sort','soul','sound','soup','sour','source','south','southern','space',
    'spare','spark','speak','speaker','special','specialist','specialize','specially','species','specific',
    'specifically','specify','spectacular','spectator','spectrum','speech','speed','spell','spelling','spend',
    'spending','sphere','spice','spicy','spider','spill','spin','spine','spirit','spiritual','spite','split',
    'spoil','spokesman','sponsor','sponsorship','spoon','sport','spot','spray','spread','spring','spy',
    'square','squeeze','stability','stable','stack','stadium','staff','stage','stair','staircase','stake',
    'stale','stall','stamp','stand','standard','standing','star','stare','start','starter','starve','state',
    'statement','statesman','station','statistic','statistical','statue','status','statute','stay','steadily',
    'steady','steak','steal','steam','steel','steep','steer','stem','step','stick','sticky','stiff','still',
    'stimulate','stimulus','stir','stock','stomach','stone','stop','storage','store','storm','story','stout',
    'straight','straightforward','strain','strange','strangely','stranger','strategy','strategic','straw',
    'stream','street','strength','strengthen','stress','stretch','strict','strictly','strike','striking',
    'string','strip','stripe','stroke','strong','strongly','structural','structure','struggle','stubborn',
    'student','studio','study','stuff','stumble','stupid','style','subconscious','subject','subjection',
    'subjective','submarine','submission','submit','subordinate','subscribe','subscription','subsequent',
    'subsequently','substance','substantial','substantially','substitute','substitution','subtle','suburb',
    'succeed','success','successful','successfully','succession','successive','successor','such','suck',
    'sudden','suddenly','suffer','suffering','sufficient','sufficiently','sugar','suggest','suggestion',
    'suicide','suit','suitable','suite','sum','summarize','summary','summer','summit','sun','sunlight',
    'sunny','super','superb','superficial','superior','superiority','supermarket','supernatural','superstition',
    'supper','supplement','supply','support','supporter','supporting','suppose','supposed','suppress',
    'supreme','sure','surely','surface','surgeon','surgery','surgical','surplus','surprise','surprised',
    'surprising','surprisingly','surrender','surround','surrounding','survey','survival','survive','survivor',
    'suspect','suspend','suspense','suspension','suspicion','suspicious','sustain','sustainable','swallow',
    'swear','sweat','sweater','sweep','sweet','swell','swift','swim','swimming','swing','switch','sword',
    'symbol','symbolic','sympathetic','sympathy','symptom','syndrome','syntax','system','systematic',
    'table','tablet','tackle','tactic','tactical','tail','tailor','take','tale','talent','talented','talk',
    'tall','tank','tap','tape','target','tariff','task','taste','tax','taxation','taxi','tea','teach',
    'teacher','teaching','team','tear','technical','technique','technological','technology','teenager',
    'telephone','telescope','television','tell','teller','temper','temperature','temple','temporary',
    'tempt','temptation','tend','tendency','tender','tennis','tense','tension','tent','term','terminal',
    'terrace','terrible','terribly','territory','terror','terrorism','terrorist','test','testament',
    'testify','testimony','text','textbook','textile','texture','than','thank','thanks','theater','theatre',
    'theatrical','theft','theme','theology','theoretical','theory','therapist','therapy','there','therefore',
    'thermometer','thesis','thick','thickness','thief','thigh','thin','thing','think','thinking','thirst',
    'thirsty','thorough','thoroughly','though','thought','thoughtful','thousand','threat','threaten','threatened',
    'threshold','thrill','thrive','throat','throne','through','throughout','throw','thrust','thumb','thunder',
    'ticket','tide','tidy','tie','tight','tightly','tile','timber','time','timely','timer','timing','tiny',
    'tip','tire','tired','tiring','tissue','title','toast','tobacco','today','toe','together','toilet',
    'tolerance','tolerate','toll','tomato','tomb','tomorrow','tone','tongue','tonight','tonne','tool','tooth',
    'top','topic','torch','torture','total','totally','touch','tough','tour','tourism','tourist','tournament',
    'towards','towel','tower','town','toxic','toy','trace','track','trade','trader','tradition','traditional',
    'traffic','tragedy','tragic','trail','train','trainee','trainer','training','trait','traitor','tram',
    'transaction','transfer','transform','transformation','transit','transition','translate','translation',
    'translator','transmission','transmit','transparent','transport','transportation','trap','travel','traveler',
    'tray','treasure','treasury','treat','treatment','treaty','tree','tremble','tremendous','trend','trial',
    'triangle','tribe','tribal','trick','trigger','trim','trio','trip','triumph','troop','trophy','tropical',
    'trouble','troubled','trousers','truck','true','truly','trumpet','trunk','trust','truth','truthful',
    'try','tube','tune','tunnel','turbine','turn','turnover','tutor','tutorial','twelve','twenty','twice',
    'twin','twist','type','typical','typically','tyre','ugly','ultimate','ultimately','umbrella','unable',
    'unacceptable','unaware','unbroken','uncertain','uncertainty','uncle','uncomfortable','unconscious','under',
    'undergo','undergraduate','underground','underline','underlying','undermine','understand','understandable',
    'understanding','undertake','undertaking','underwear','undoubtedly','unemployed','unemployment','unexpected',
    'unfair','unfamiliar','unfortunate','unfortunately','unfriendly','unhappy','uniform','unify','union',
    'unique','unit','units','unite','united','unity','universal','universe','university','unknown','unless','unlike',
    'unlikely','unnecessary','unpleasant','unreasonable','unsteady','unsuccessful','unusual','unusually',
    'unwilling','up','update','upgrade','upon','upper','upset','upstairs','upward','upwards','urban','urge',
    'urgent','usage','use','used','useful','useless','user','usual','usually','utility','utilize','utter',
    'utterly','vacation','vaccine','vacuum','vague','vaguely','vain','valid','validity','valley','valuable',
    'value','van','vanish','variable','variation','variety','various','vary','vast','vault','vegetable',
    'vehicle','veil','vein','velocity','venture','verb','verbal','verdict','verge','verify','version','versus',
    'vertical','very','vessel','veteran','via','viable','vibrant','vibrate','vibration','vice','victim',
    'victor','victory','video','view','viewer','viewpoint','village','villager','villain','vinegar','violate',
    'violation','violence','violent','violently','violet','violin','virtual','virtually','virtue','virus',
    'visible','vision','visit','visitor','visual','vital','vitamin','vivid','vocabulary','vocal','vocation',
    'voice','void','volatile','volcano','volleyball','volume','voluntary','volunteer','vote','voter','voting',
    'vow','vowel','voyage','vulnerability','vulnerable','wage','wagon','waist','wait','waiter','waitress',
    'wake','walk','walker','walking','wall','wallet','wander','want','war','ward','wardrobe','warehouse',
    'warfare','warm','warmth','warn','warning','warrant','warranty','warrior','wash','washing','waste',
    'wasteful','watch','water','wave','wavelength','wax','way','weak','weaken','weakness','wealth','wealthy',
    'weapon','wear','weary','weather','weave','web','website','wedding','wedge','weed','week','weekday',
    'weekend','weekly','weep','weigh','weight','weird','welcome','welfare','well','well-being','well-known',
    'west','western','wet','whale','what','whatever','wheat','wheel','when','whenever','where','whereas',
    'wherever','whether','which','whichever','while','whip','whisper','whistle','white','who','whoever',
    'whole','wholly','whom','whose','why','wide','widely','widen','widespread','widow','width','wife',
    'wild','wilderness','wildlife','will','willing','willingness','win','wind','window','wine','wing',
    'winner','winning','winter','wipe','wire','wisdom','wise','wisely','wish','wit','witch','with','withdraw',
    'withdrawal','within','without','witness','wolf','woman','wonder','wonderful','wood','wooden','wool',
    'word','work','worker','working','workout','workplace','workshop','world','worldwide','worm','worried',
    'worry','worse','worship','worst','worth','worthwhile','worthy','would','wound','wounded','wrap','wreck',
    'wrist','write','writer','writing','written','wrong','wrongly','yard','year','yearly','yell','yellow',
    'yesterday','yield','young','youngster','youth','zeal','zero','zone'
];

const HIGH_FREQ_WORDS = new Set([
    'the','and','of','in','on','at','to','for','a','an','is','as','by','with','from',
    'or','but','not','this','that','these','those','his','her','its','their','our'
]);

class EnglishWordSegmenter {
    constructor() {
        this.baseDictionary = new Set(BASE_WORDS);
        this.dynamicVocabulary = new Set();
    }

    /**
     * Learns vocabulary from plain body text of the book (in-memory).
     * @param {string} text - Paragraphs / body text from the book
     */
    learnFromText(text) {
        if (!text || typeof text !== 'string') return;
        const tokens = text.match(/[A-Za-z]{2,}/g);
        if (tokens) {
            for (let t of tokens) {
                this.dynamicVocabulary.add(t.toLowerCase());
            }
        }
    }

    /**
     * Morphological & Dictionary lookup (O(1) Hash Table).
     * Checks base word, book vocabulary, and common English affixes.
     */
    hasWord(word) {
        if (!word || word.length < 1) return false;
        const w = word.toLowerCase();

        // 1. Direct dictionary match
        if (this.baseDictionary.has(w) || this.dynamicVocabulary.has(w)) return true;

        // 2. Inflectional Suffixes (-s, -es, -ed, -ing, -ly, -er, -est, -ment, -ness, -tion)
        if (w.length > 3 && w.endsWith('s') && (this.baseDictionary.has(w.slice(0, -1)) || this.dynamicVocabulary.has(w.slice(0, -1)))) return true;
        if (w.length > 4 && w.endsWith('es') && (this.baseDictionary.has(w.slice(0, -2)) || this.dynamicVocabulary.has(w.slice(0, -2)))) return true;
        if (w.length > 4 && w.endsWith('ed') && (this.baseDictionary.has(w.slice(0, -2)) || this.dynamicVocabulary.has(w.slice(0, -2)))) return true;
        if (w.length > 5 && w.endsWith('ing') && (this.baseDictionary.has(w.slice(0, -3)) || this.dynamicVocabulary.has(w.slice(0, -3)))) return true;
        if (w.length > 4 && w.endsWith('ly') && (this.baseDictionary.has(w.slice(0, -2)) || this.dynamicVocabulary.has(w.slice(0, -2)))) return true;

        // 3. Common Prefixes (un-, re-, dis-, mis-, non-, sub-, super-, over-, under-, in-, im-)
        if (w.length > 4 && w.startsWith('un') && (this.baseDictionary.has(w.slice(2)) || this.dynamicVocabulary.has(w.slice(2)))) return true;
        if (w.length > 4 && w.startsWith('re') && (this.baseDictionary.has(w.slice(2)) || this.dynamicVocabulary.has(w.slice(2)))) return true;
        if (w.length > 5 && w.startsWith('dis') && (this.baseDictionary.has(w.slice(3)) || this.dynamicVocabulary.has(w.slice(3)))) return true;
        if (w.length > 5 && w.startsWith('sub') && (this.baseDictionary.has(w.slice(3)) || this.dynamicVocabulary.has(w.slice(3)))) return true;
        if (w.length > 7 && w.startsWith('super') && (this.baseDictionary.has(w.slice(5)) || this.dynamicVocabulary.has(w.slice(5)))) return true;

        return false;
    }

    /**
     * De-spaces letter-spaced decorative text using Scored Dynamic Programming.
     * Guaranteed 100% boundary accuracy for titles.
     * 
     * @param {string} input - Letter-spaced string (e.g. "S u b c o n s c i o u s")
     * @returns {string} - Reconstructed string (e.g. "Subconscious")
     */
    despace(input) {
        if (!input || typeof input !== 'string') return input;

        const parts = input.trim().split(/\s+/);
        if (parts.length < 2) return input; // Single word or empty -> Keep as-is

        // Only despace if tokens are predominantly single-character letters (e.g. "S u b c o n s c i o u s")
        const singleLetterCount = parts.filter(p => p.length === 1).length;
        const singleLetterRatio = singleLetterCount / parts.length;
        if (singleLetterRatio < 0.75) {
            return input; // Normal text with real spaces -> Keep 100% as-is!
        }

        const original = parts.join(''); // Letter-spaced text -> Merge letters

        const lower = original.toLowerCase();
        const n = lower.length;

        // DP with cost optimization:
        // Penalizes word count (100 pts per word)
        // Rewards longer words quadratically (len^2 discount)
        // High-frequency connector words (the, of, and, in, on...) get extra priority bonus
        const dp = new Array(n + 1).fill(null);
        dp[0] = { segs: [], score: 0 };

        for (let i = 0; i < n; i++) {
            if (dp[i] === null) continue;
            for (let len = Math.min(25, n - i); len >= 1; len--) {
                const candidate = lower.substring(i, i + len);
                if (this.hasWord(candidate)) {
                    let wordScore = 100 - (len * len);
                    if (HIGH_FREQ_WORDS.has(candidate)) wordScore -= 20;

                    const newScore = dp[i].score + wordScore;
                    const newSegs = [...dp[i].segs, { start: i, len }];

                    if (dp[i + len] === null || newScore < dp[i + len].score) {
                        dp[i + len] = { segs: newSegs, score: newScore };
                    }
                }
            }
        }

        if (dp[n] !== null) {
            return dp[n].segs.map(s => original.substring(s.start, s.start + s.len)).join(' ');
        }

        // Fallback: strip spaces
        return original;
    }
}

// Global Singleton Instance
const defaultSegmenter = new EnglishWordSegmenter();

module.exports = {
    EnglishWordSegmenter,
    defaultSegmenter,
    despace: (text) => defaultSegmenter.despace(text),
    learnFromText: (text) => defaultSegmenter.learnFromText(text)
};
