export default function Escrow({
  address,
  arbiter,
  beneficiary,
  value,
  isApproved,
  handleApprove,
}) {
  return (
    <div className="existing-contract">
      <ul className="fields">
        <li>
          <div> Arbiter </div>
          <div> {arbiter} </div>
        </li>
        <li>
          <div> Beneficiary </div>
          <div> {beneficiary} </div>
        </li>
        <li>
          <div> Value </div>
          <div> {value} </div>
        </li>
        {isApproved ? (
          <div
            className="button complete"
            id={address}
          >
            ✓ It's been approved!
          </div>
        ) : (
          <div
            className="button"
            id={address}
            onClick={(e) => {
              e.preventDefault();
              handleApprove();
            }}
          >
            Approve
          </div>
        )}
      </ul>
    </div>
  );
}
