// /tools/clear-firestore.js
// 주의: Firestore 컬렉션의 문서를 모두 삭제합니다. 되돌릴 수 없습니다.
const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const COLLECTIONS = [
  "users",
  "contacts",
  "roles",
  "notices",
  "boardPosts",
  "applications_jobseeker",
  "applications_employer",
  "contactRequests"
];

async function deleteCollection(name){
  const snap = await db.collection(name).get();
  if(snap.empty){
    console.log(name, "empty");
    return;
  }
  let batch = db.batch();
  let n = 0;
  for(const d of snap.docs){
    batch.delete(d.ref);
    n++;
    if(n >= 400){
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if(n>0) await batch.commit();
  console.log("deleted", name);
}

(async ()=>{
  for(const c of COLLECTIONS){
    await deleteCollection(c);
  }
  console.log("done.");
})().catch(e=>{
  console.error(e);
  process.exit(1);
});
