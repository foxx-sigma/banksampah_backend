const fs = require('fs');
const path = require('path');

const collPath = path.join(__dirname, 'postman', 'BankSampahDigital.postman_collection.json');
const envPath = path.join(__dirname, 'postman', 'BankSampahDigital.postman_environment.json');

const coll = JSON.parse(fs.readFileSync(collPath, 'utf8'));
const env = JSON.parse(fs.readFileSync(envPath, 'utf8'));

// 1. ENVIRONMENT VARIABLES
// Hapus variabel usang, pastikan variabel ada placeholder.
// According constraints: "Tanpa nilai rahasia nyata (password, JWT, connection string): pakai placeholder atau kosongkan."
env.values.forEach(v => {
  if (['token', 'admin_token', 'nasabah_token'].includes(v.key)) {
    v.value = "";
  }
});
// Need to collect which variables are actually used in collection to find "orphans".
const usedVars = new Set(['base_url']); 
function findVars(str) {
  const regex = /\{\{([^}]+)\}\}/g;
  let m;
  while ((m = regex.exec(str)) !== null) {
      usedVars.add(m[1]);
  }
}
function walkCollectionForVars(items) {
  for (let item of items) {
    if (item.item) {
      walkCollectionForVars(item.item);
    } else {
      findVars(item.request.url.raw || item.request.url);
      if (item.request.body && item.request.body.raw) {
          findVars(item.request.body.raw);
      }
      if (item.request.header) {
          item.request.header.forEach(h => findVars(h.value));
      }
      if (item.event) {
          item.event.forEach(e => {
            if (e.script && e.script.exec) {
               e.script.exec.forEach(l => findVars(l));
               // Specifically extract variable settings from test scripts
               const setMatches = e.script.exec.join('\n').match(/pm\.environment\.set\("([^"]+)"/g);
               if (setMatches) {
                   setMatches.forEach(match => {
                       const v = match.match(/"([^"]+)"/)[1];
                       usedVars.add(v);
                   });
               }
            }
          })
      }
    }
  }
}
// 2. Add logout if missing (in Auth folder)
let authFolder = coll.item.find(i => i.name.includes("Auth"));
if (authFolder) {
    const hasLogout = authFolder.item.find(i => i.name.toLowerCase().includes('logout'));
    if (!hasLogout) {
        authFolder.item.push({
            name: "Logout",
            request: {
                method: "POST",
                header: [],
                url: {
                    raw: "{{base_url}}/api/v1/auth/logout",
                    host: ["{{base_url}}"],
                    path: ["api", "v1", "auth", "logout"]
                }
            },
            response: []
        });
    }
}

walkCollectionForVars(coll.item);

// Clean env
env.values = env.values.filter(v => usedVars.has(v.key) || [
    'nasabahId', 'kategoriId', 'setorId', 'hadiahId', 'penukaranId', 'current_month'
    ].includes(v.key));

// Add missing vars to env
const existingVarKeys = new Set(env.values.map(v => v.key));
for (let v of usedVars) {
  if (!existingVarKeys.has(v)) {
      env.values.push({
          key: v,
          value: v.includes('token') ? "" : (v === 'current_month' ? '2026-09' : ''),
          type: v.includes('token') ? "secret" : "default",
          enabled: true
      });
  }
}

// 3. Update tests
function injectTests(items) {
  for (let item of items) {
    if (item.item) {
      if(!item.description) {
         item.description = "Urutan folder mendukung chaining. Pastikan login di role yang sesuai sebelum mengeksekusi request di dalam folder ini (Admin dulu, lalu Nasabah).";
      }
      injectTests(item.item);
    } else {
      let isCreate = item.request.method === "POST" && !item.request.url.raw.includes("login") && !item.request.url.raw.includes("logout") && !item.request.url.raw.includes("tukar") && !item.request.url.raw.includes("seed"); 
      // well penukaran-poin/tukar is create.
      if (item.request.url.raw.includes("penukaran-poin/tukar")) isCreate = true;
      if (item.name.includes("Pengajuan")) isCreate = true;
      let isLogin = item.request.url.raw.includes("login");

      let statusExpect = (item.request.method === "POST" && isCreate) ? 201 : 200;
      if (item.request.url.raw.includes("register")) statusExpect = 201;
      if (item.request.url.raw.includes("seed")) statusExpect = 201;

      if (!item.event) item.event = [];
      let testEvent = item.event.find(e => e.listen === 'test');
      if (!testEvent) {
          testEvent = { listen: 'test', script: { exec: [], type: 'text/javascript' } };
          item.event.push(testEvent);
      }
      
      let newExec = [];
      newExec.push(`pm.test("Status code is ${statusExpect}", function () {`);
      newExec.push(`    pm.response.to.have.status(${statusExpect});`);
      newExec.push(`});`);
      newExec.push("");
      newExec.push(`pm.test("Content-Type is JSON", function () {`);
      newExec.push(`    pm.response.to.be.json;`);
      newExec.push(`});`);
      newExec.push("");
      newExec.push(`const res = pm.response.json();`);
      
      // Preserve or set ID extraction
      if (isLogin) {
          newExec.push(`pm.test("Memiliki cookie akses token dari kode", function () {`);
          newExec.push(`    pm.expect(pm.cookies.has('accessToken')).to.be.true;`);
          newExec.push(`});`);
          newExec.push(`if (res && res.data && res.data.token) {`);
          newExec.push(`    pm.environment.set("token", res.data.token);`);
          if (item.name.toLowerCase().includes("nasabah")) {
              newExec.push(`    pm.environment.set("nasabah_token", res.data.token);`);
              newExec.push(`    if (res.data.user && res.data.user.nasabah) {`);
              newExec.push(`        pm.environment.set("nasabahId", res.data.user.nasabah.id);`);
              newExec.push(`    }`);
          } else {
              newExec.push(`    pm.environment.set("admin_token", res.data.token);`);
          }
          newExec.push(`    pm.environment.set("user_role", res.data.user ? res.data.user.role : "");`);
          newExec.push(`}`);
      } else if (isCreate || item.name.includes("List") || item.name.includes("Riwayat") || item.name.includes("Semua")) {
          let idName = "";
          if (item.request.url.raw.includes("nasabah")) idName = "nasabahId";
          else if (item.request.url.raw.includes("kategori")) idName = "kategoriId";
          else if (item.request.url.raw.includes("setor")) idName = "setorId";
          else if (item.request.url.raw.includes("hadiah")) idName = "hadiahId";
          else if (item.request.url.raw.includes("penukaran")) idName = "penukaranId";

          if (idName) {
              if (isCreate) {
                  newExec.push(`if (res && res.data && res.data.id) {`);
                  newExec.push(`    pm.environment.set("${idName}", res.data.id);`);
                  newExec.push(`}`);
              } else {
                  // For list, just optionally set if we didn't have one and we need a fallback, 
                  // but the prompt says: "request create menyimpan ID hasilnya ke variabel environment... dipakai request detail". 
                  // We can just keep the list fallback because it's handy.
                  newExec.push(`if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {`);
                  newExec.push(`    pm.environment.set("${idName}", res.data[0].id);`);
                  newExec.push(`}`);
              }
          }
      }
      
      testEvent.script.exec = newExec;
    }
  }
}
injectTests(coll.item);

fs.writeFileSync(collPath, JSON.stringify(coll, null, 2));
fs.writeFileSync(envPath, JSON.stringify(env, null, 2));
console.log("Done updating JSON files.");
