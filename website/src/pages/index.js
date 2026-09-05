import clsx from "clsx";
import CodeBlock from "@theme/CodeBlock";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import styles from "./index.module.css";

const collectionExample = `import { IModel, PouchCollection } from "pouchorm";

interface Person extends IModel {
  name: string;
  age: number;
}

class People extends PouchCollection<Person> {
  constructor() {
    super({
      database: "app-data",
      // Stored with each document, so keep this name stable.
      collection: "people",
    });
  }
}

const people = new People();
// No _id means upsert creates a document with a UUIDv7.
const ada = await people.upsert({
  name: "Ada Lovelace",
  age: 36,
});`;

const capabilities = [
  {
    title: "Stable collection identity",
    description:
      "Choose the collection name stored with each document. Production builds and class renames cannot change it.",
  },
  {
    title: "Predictable writes",
    description:
      "Create and update through one method, retain PouchDB revisions, validate models, and handle conflicts without changing caller-owned objects.",
  },
  {
    title: "PouchDB remains available",
    description:
      "Use the underlying database for attachments, plugins, and platform-specific adapters when the collection API is not the right level.",
  },
];

function HomepageHeader() {
  return (
    <header className={styles.hero}>
      <div className={clsx("container", styles.heroGrid)}>
        <div className={styles.heroCopy}>
          <span className={styles.versionBadge}>Documentation for 5.x</span>
          <Heading as="h1">Typed collections for PouchDB.</Heading>
          <p>
            PouchORM adds models, named collections, validation, query helpers,
            and synchronization management while keeping the PouchDB database
            available when you need it.
          </p>
          <div className={styles.actions}>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started"
            >
              Get started
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="https://github.com/iyobo/pouchorm"
            >
              View on GitHub
            </Link>
          </div>
        </div>
        <div
          className={styles.codePanel}
          aria-label="PouchORM collection example"
        >
          <div className={styles.codeHeader}>
            <span>people.ts</span>
            <span>TypeScript</span>
          </div>
          <CodeBlock language="typescript">{collectionExample}</CodeBlock>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout
      title="Typed collections for PouchDB"
      description="PouchORM documentation for typed PouchDB models, collections, queries, writes, validation, and synchronization."
    >
      <HomepageHeader />
      <main>
        <section className={styles.capabilities}>
          <div className="container">
            <Heading as="h2">
              A small layer over the database you already use
            </Heading>
            <div className={styles.capabilityGrid}>
              {capabilities.map((capability) => (
                <article
                  className={styles.capabilityCard}
                  key={capability.title}
                >
                  <Heading as="h3">{capability.title}</Heading>
                  <p>{capability.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className={styles.migrationSection}>
          <div className={clsx("container", styles.migrationCard)}>
            <div>
              <span className={styles.eyebrow}>Using PouchORM 4?</span>
              <Heading as="h2">
                Review the breaking changes before upgrading.
              </Heading>
              <p>
                Version 5 requires stable collection names, a PouchDB peer
                dependency, and explicit validator registration.
              </p>
            </div>
            <Link
              className="button button--outline button--primary button--lg"
              to="/docs/migrating-to-v5"
            >
              Read the migration guide
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
