import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "pouchorm-consumer-"),
);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const packageManifest = JSON.parse(
  await readFile(path.join(repository, "package.json"), "utf8"),
);

const run = (command, args, cwd = temporaryDirectory) => {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
  });
};

try {
  const packOutput = execFileSync(
    npm,
    [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      temporaryDirectory,
    ],
    { cwd: repository, encoding: "utf8" },
  );
  const [packResult] = JSON.parse(packOutput);
  const packedFiles = packResult.files.map((file) => file.path);
  const unexpectedFile = packedFiles.find((file) => {
    return (
      file.includes("/tests/") ||
      file.includes("/sandbox/") ||
      file.endsWith(".test.js")
    );
  });
  if (unexpectedFile)
    throw new Error(`The package contains an internal file: ${unexpectedFile}`);

  const tarball = path.join(temporaryDirectory, packResult.filename);
  await writeFile(
    path.join(temporaryDirectory, "package.json"),
    JSON.stringify({ name: "pouchorm-consumer-test", private: true }, null, 2),
  );
  run(npm, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    tarball,
    "pouchdb@9.0.0",
    "pouchdb-find@9.0.0",
  ]);

  await writeFile(
    path.join(temporaryDirectory, "consumer.ts"),
    `import {
  ClassValidate,
  IModel,
  PouchCollection,
  PouchORM,
  SyncResult
} from 'pouchorm';

interface Note extends IModel {
  title: string;
}

class Notes extends PouchCollection<Note> {
  constructor() {
    super({
      database: 'notes',
      collection: 'notes',
      validate: ClassValidate.OFF
    });
  }
}

const notes = new Notes();
const possibleNote: Promise<Note | null> = notes.findOne({ title: 'Hello' });
const operation = PouchORM.startSync<Note>('notes', 'backup', {
  onChange(change: SyncResult<Note>) {
    change.change.docs?.forEach(note => note.title);
  }
});

operation.cancel();
void possibleNote;
`,
  );
  await writeFile(
    path.join(temporaryDirectory, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          module: "Node16",
          moduleResolution: "Node16",
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2020",
        },
        files: ["consumer.ts"],
      },
      null,
      2,
    ),
  );
  run(process.execPath, [
    path.join(repository, "node_modules", "typescript", "bin", "tsc"),
    "--project",
    "tsconfig.json",
  ]);

  await writeFile(
    path.join(temporaryDirectory, "runtime.cjs"),
    `const PouchDB = require('pouchdb');
const PouchFind = require('pouchdb-find');
const { ClassValidate, PouchCollection, PouchORM } = require('pouchorm');

if (PouchORM.PouchDB !== PouchDB) {
  throw new Error('PouchORM and the consumer loaded different PouchDB constructors.');
}
PouchDB.plugin(PouchFind);

class Notes extends PouchCollection {
  constructor(database, validate) {
    super({ database, collection: 'notes', validate });
    this.deleted = new Promise(resolve => {
      this.resolveDeleted = resolve;
    });
  }

  async onChangeDeleted(item) {
    this.resolveDeleted(item);
  }
}

class Archives extends PouchCollection {
  constructor(database) {
    super({ database, collection: 'archives' });
  }
}

(async () => {
  const database = 'packed_consumer';
  const notes = new Notes(database);
  const saved = await notes.upsert({ title: 'Packaged library' });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(saved._id)) {
    throw new Error('The installed package did not generate a UUIDv7 document ID.');
  }
  const found = await notes.findById(saved._id);
  if (!found || found.title !== 'Packaged library') {
    throw new Error('The installed package did not complete a write and read.');
  }

  const archives = new Archives(database);
  const archived = await archives.upsert({ title: 'Archived note' });
  try {
    await notes.remove(archived);
    throw new Error('A collection deleted a document owned by another collection.');
  } catch (error) {
    if (!String(error.message).includes('belongs to collection archives, not notes')) {
      throw error;
    }
  }
  if (!(await archives.findById(archived._id))) {
    throw new Error('A rejected cross-collection deletion removed the document.');
  }

  await notes.remove(saved);
  const deleted = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('The deletion hook did not run.'));
    }, 1000);
    notes.deleted.then(item => {
      clearTimeout(timeout);
      resolve(item);
    }, reject);
  });
  if (deleted._id !== saved._id || deleted.$collectionType !== 'notes') {
    throw new Error('The deletion hook received the wrong document.');
  }
  await PouchORM.deleteDatabase(database);

  const validationDatabase = 'packed_consumer_validation';
  const validatingNotes = new Notes(validationDatabase, ClassValidate.ON_AND_REJECT);
  try {
    await validatingNotes.upsert({ title: 'No validator installed' });
    throw new Error('Validation unexpectedly succeeded without class-validator.');
  } catch (error) {
    if (!String(error.message).includes('no validator is configured')) throw error;
  } finally {
    await PouchORM.deleteDatabase(validationDatabase);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
`,
  );
  run(process.execPath, ["runtime.cjs"]);

  const installedPackage = JSON.parse(
    await readFile(
      path.join(temporaryDirectory, "node_modules", "pouchorm", "package.json"),
      "utf8",
    ),
  );
  if (installedPackage.version !== packageManifest.version) {
    throw new Error(
      `Expected package version ${packageManifest.version}, received ${installedPackage.version}.`,
    );
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
