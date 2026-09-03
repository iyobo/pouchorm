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
  }
}

(async () => {
  const database = 'packed_consumer';
  const notes = new Notes(database);
  const saved = await notes.upsert({ title: 'Packaged library' });
  const found = await notes.findById(saved._id);
  if (!found || found.title !== 'Packaged library') {
    throw new Error('The installed package did not complete a write and read.');
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
  if (installedPackage.version !== "5.0.0") {
    throw new Error(
      `Expected package version 5.0.0, received ${installedPackage.version}.`,
    );
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
