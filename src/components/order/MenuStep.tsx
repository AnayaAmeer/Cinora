import { categories, menu } from "../../data/menu";
import { formatRs } from "../../lib/format";
import { Quantity } from "../Quantity";

type MenuStepProps = {
  quantities: Record<string, number>;
  error?: string;
  onQty: (id: string, qty: number) => void;
};

export function MenuStep({ quantities, error, onQty }: MenuStepProps) {
  return (
    <div className="step-body">
      {categories.map((category) => (
        <section key={category} className="menu-group" aria-labelledby={`cat-${category}`}>
          <h2 id={`cat-${category}`} className="category">
            {category}
          </h2>
          <div className="menu-list">
            {menu
              .filter((item) => item.category === category)
              .map((item) => (
                <article key={item.id} className={item.available ? "product" : "product is-soon"}>
                  <img src={item.image} alt={item.imageAlt} width={96} height={96} />
                  <div className="product-body">
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <div className="product-foot">
                      {item.available ? (
                        <>
                          <p className="price">{formatRs(item.price)}</p>
                          <Quantity
                            name={item.name}
                            value={quantities[item.id] ?? 0}
                            onChange={(qty) => onQty(item.id, qty)}
                          />
                        </>
                      ) : (
                        <p className="coming">Coming soon</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </section>
      ))}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="hint">Up to 12 classic rolls in one order. Cookies are coming soon.</p>
      )}
    </div>
  );
}
