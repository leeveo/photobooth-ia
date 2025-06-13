"use client"; // Add this to make it a client component if it uses non-serializable data

// Look for any place where complex objects are passed or returned
// For example, instead of:
// return { 
//   someFunction: () => {}, 
//   complexObject: new SomeClass() 
// };

// Do this:
// return {
//   id: data.id,
//   name: data.name,
//   // Only include serializable data
// };