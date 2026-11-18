export const StatusBadge = ({ status }) => {
  const k = status === 'Belum Diproses' ? 'belum' : status === 'Diproses' ? 'proses' : 'selesai';
  return <span className={`badge st-${k}`}>{status}</span>;
};

export const UrgencyBadge = ({ urgensi }) => (
  <span className={`badge ug-${urgensi.toLowerCase()}`}>{urgensi}</span>
);
