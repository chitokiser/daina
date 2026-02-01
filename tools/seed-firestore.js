// /tools/seed-firestore.js
const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * 카테고리 키는 프론트(UI/필터/라벨)와 동일해야 합니다.
 * 이미지: /public/assets/images/jobseeker/1.png ~ 100.png (ZIP에는 1~20만 포함)
 */
const CATEGORIES = [
  { key: "domestic_tech", label: "베트남기술직", prefix: "vt" },
  { key: "domestic_student", label: "베트남단순생산직", prefix: "vs" },
  { key: "domestic_service", label: "베트남서비스직", prefix: "vv" },
  { key: "vn_housekeeping", label: "베트남가사도우미", prefix: "vh" },
  { key: "vn_vehicle", label: "베트남지입차량", prefix: "vcar" },
  { key: "korean_expat", label: "한국기술직", prefix: "kt" },
  { key: "seasonal_worker", label: "한국계절근로자", prefix: "kw" },
  { key: "koreaservice", label: "한국서비스직", prefix: "ks" }
];

const NAMES = ["Nguy\u1ec5n V\u0103n An","Tr\u1ea7n Minh \u0110\u1ee9c","L\u00ea Ho\u00e0ng Nam","Ph\u1ea1m Qu\u1ed1c Huy","V\u00f5 Th\u1ecb Lan","\u0110\u1eb7ng Thu H\u00e0","B\u00f9i Thanh T\u00f9ng","Ho\u00e0ng Gia B\u1ea3o","D\u01b0\u01a1ng Qu\u1ed1c Kh\u00e1nh","\u0110\u1ed7 Minh Qu\u00e2n","Nguy\u1ec5n Th\u1ecb Mai","Tr\u1ea7n Th\u1ecb H\u01b0\u01a1ng","L\u00ea Th\u1ecb Ng\u1ecdc","Ph\u1ea1m Th\u1ecb Thu","V\u00f5 Minh T\u00fa","\u0110\u1eb7ng Minh Anh","B\u00f9i Th\u1ecb Linh","Ho\u00e0ng Th\u1ecb Y\u1ebfn","D\u01b0\u01a1ng Th\u1ecb H\u1ea1nh","\u0110\u1ed7 Th\u1ecb Trang","Nguy\u1ec5n H\u1eefu Ph\u00fac","Tr\u1ea7n V\u0103n Long","L\u00ea V\u0103n S\u01a1n","Ph\u1ea1m V\u0103n Ki\u00ean","V\u00f5 V\u0103n L\u1ee3i","\u0110\u1eb7ng V\u0103n Th\u00e0nh","B\u00f9i V\u0103n Khoa","Ho\u00e0ng V\u0103n Vinh","D\u01b0\u01a1ng V\u0103n B\u00ecnh","\u0110\u1ed7 V\u0103n D\u0169ng"];

const SKILLS = ["용접","전기","배관","타일","목공","도장","통역","운전","기계정비","품질검사","생산라인","포장","CNC","미싱","조리","바리스타","간병","청소","가드닝","IT지원"];
const WORK = ["available","working","leave","unknown"];

// 주요 도시(드롭다운) – 프론트 regions.js 와 동일 키 사용 권장
const PROVINCES = [
  { key:"hn", label:"하노이", cities:[{key:"hn",label:"하노이"}] },
  { key:"hcm", label:"호치민", cities:[{key:"hcm",label:"호치민"}] },
  { key:"dn", label:"다낭", cities:[{key:"dn",label:"다낭"}] },
  { key:"hp", label:"하이퐁", cities:[{key:"hp",label:"하이퐁"}] },
  { key:"ct", label:"껀터", cities:[{key:"ct",label:"껀터"}] },
  { key:"bd", label:"빈즈엉", cities:[{key:"bd",label:"빈즈엉"}] },
  { key:"na", label:"냐짱", cities:[{key:"na",label:"냐짱"}] },
  { key:"dl", label:"달랏", cities:[{key:"dl",label:"달랏"}] }
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pad(n, w) {
  return String(n).padStart(w, "0");
}
function nowIso() {
  return new Date().toISOString();
}
function pickCity() {
  const p = pick(PROVINCES);
  const c = pick(p.cities);
  return {
    provKey: p.key, provLabel: p.label,
    cityKey: c.key, cityLabel: c.label
  };
}

function makeUser(categoryKey, prefix, i) {
  const name = pick(NAMES);
  const userId = `${prefix}_${pad(i, 4)}`;
  const skills = Array.from({ length: 2 }, () => pick(SKILLS)).join(", ");
  const rating = Math.round((Math.random() * 5) * 10) / 10;

  const cur = pickCity();
  const work = pickCity();

  // 사진: /public/assets/images/jobseeker/1.png ~ 100.png
  const imgNo = ((i - 1) % 100) + 1;
  const photo = `./assets/images/jobseeker/${imgNo}.png`;

  return {
    userId,
    category: categoryKey,
    name,
    profile: `${name} 프로필. 가능업무: ${skills}. 현장투입 가능 여부는 상담 후 확정.`,
    skills,
    workStatus: pick(WORK),
    rating,
    photo,

    // 지역(드롭다운)
    curProvince: cur.provKey,
    curProvinceLabel: cur.provLabel,
    curCity: cur.cityKey,
    curCityLabel: cur.cityLabel,

    workProvince: work.provKey,
    workProvinceLabel: work.provLabel,
    workCity: work.cityKey,
    workCityLabel: work.cityLabel,

    ownerUid: null,
    approved: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function makeContact(userId) {
  return {
    userId,
    phone: `010-${pad(Math.floor(Math.random()*10000),4)}-${pad(Math.floor(Math.random()*10000),4)}`,
    email: `${userId}@example.com`,
    kakao: null,
    zalo: null,
    ownerUid: null,
    approved: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

async function seed() {
  console.log("Seeding users + contacts...");

  // 500개 초과 시 batch 제한 때문에 400 단위로 쪼개서 커밋
  const totalPerCat = 50;
  const writes = [];

  for (const c of CATEGORIES) {
    for (let i = 1; i <= totalPerCat; i++) {
      const u = makeUser(c.key, c.prefix, i);
      writes.push({ col:"users", id:u.userId, data:u });

      const contact = makeContact(u.userId);
      writes.push({ col:"contacts", id:u.userId, data:contact });
    }
  }

  let i = 0;
  while (i < writes.length) {
    const batch = db.batch();
    const chunk = writes.slice(i, i + 400);
    for (const w of chunk) {
      const ref = db.collection(w.col).doc(w.id);
      batch.set(ref, w.data, { merge:false });
    }
    await batch.commit();
    i += chunk.length;
    console.log("Committed", i, "/", writes.length);
  }

  console.log("Done. users seeded:", CATEGORIES.length * totalPerCat);
  console.log("Done. contacts seeded:", CATEGORIES.length * totalPerCat);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
