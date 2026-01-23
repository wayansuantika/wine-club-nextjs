'use client';

export default function TestPage() {
  const items = [1, 2, 3];
  
  return (
    <div>
      <div>
        {items.map((item) => {
          return (
            <div key={item}>
              <p>Item {item}</p>
            </div>
          );
        })}
      </div>
      
      <button onClick={() => console.log('click')}>
        Test Button
      </button>
    </div>
  );
}
