import { db } from './src/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

const INITIAL_POINTS = [
  { name: "Kirana Store - Ramesh", type: '15A', pricePerHour: 20, isBusy: false, lat: 12.9716, lng: 77.5946, ownerId: "demo_host_1", rating: 4.8, address: "Shop No. 5, Village Square" },
  { name: "Suresh Electronics", type: '15A', pricePerHour: 25, isBusy: false, lat: 12.9750, lng: 77.5910, ownerId: "demo_host_2", rating: 4.5, address: "Main Road, Opp. Temple" },
  { name: "Home Charger - Priya", type: '5A', pricePerHour: 15, isBusy: false, lat: 12.9680, lng: 77.5990, ownerId: "demo_host_3", rating: 4.9, address: "House 22, Green Lane" },
];

async function seed() {
  const pointsRef = collection(db, 'charging_points');
  const snapshot = await getDocs(pointsRef);
  
  if (snapshot.empty) {
    console.log("Seeding initial charging points...");
    for (const point of INITIAL_POINTS) {
      await addDoc(pointsRef, point);
    }
    console.log("Seeding complete!");
  } else {
    console.log("Database already has data. Skipping seed.");
  }
}

seed().catch(console.error);
