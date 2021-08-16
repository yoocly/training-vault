import { Collection, MongoClient } from 'mongodb';
import { encryptCredential, decryptCredential } from './../utils/crypto';
import { Credential } from './../types';
import dotenv from 'dotenv';
dotenv.config();

let client: MongoClient;
let collection: Collection<Credential>;
const dbName = 'vault';
const collectionName = 'credentials';

export async function connectDb(): Promise<void> {
  if (!process.env.DB_URI) throw new Error('No DB_URI in the .env found');
  client = new MongoClient(process.env.DB_URI);
  try {
    await client.connect();
    collection = client.db(dbName).collection(collectionName);
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`);
  }
}

export async function addOrUpdateCredential(
  credential: Credential,
  key: string
): Promise<void> {
  const encryptedCredential = encryptCredential(credential, key);
  await collection.updateMany(
    { service: credential.service },
    { $set: encryptedCredential },
    { upsert: true }
  );
}

export async function getAllCredentials(key: string): Promise<Credential[]> {
  const credentials: Credential[] = await collection
    .find({}, { projection: { _id: 0 } })
    .toArray();
  const decryptedCredentials = credentials.map((credential) =>
    decryptCredential(credential, key)
  );
  return decryptedCredentials;
}

export async function getCredential(
  service: string,
  key: string
): Promise<Credential> {
  const credential = await collection.findOne(
    {
      service: service,
    },
    { projection: { _id: 0 } }
  );
  if (!credential)
    throw new Error(`No credential found for service ${service}`);

  return decryptCredential(credential, key);
}

export async function deleteCredential(service: string): Promise<void> {
  await collection.deleteMany({ service: service });
}