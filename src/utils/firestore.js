export const idConverter = {
  toFirestore: (data) => data,
  fromFirestore: (snap) => ({
    id: snap.id,
    ...snap.data(),
  }),
};
