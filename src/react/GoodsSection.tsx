import type { Good } from '@/domain/goodStore'

type GoodsSectionProps = {
  goodName: string
  goods: Good[]
  error: string | null
  onNameChange: (name: string) => void
  onRegister: () => void
}

/** Registers new goods and services and lists the ones already known. */
export function GoodsSection({
  goodName,
  goods,
  error,
  onNameChange,
  onRegister,
}: GoodsSectionProps) {
  return (
    <section>
      <h3>Catálogo de bienes y servicios</h3>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onRegister()
        }}
      >
        <label>
          Bien o servicio
          <input value={goodName} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <button type="submit">Registrar bien o servicio</button>
      </form>
      {error && <p>{error}</p>}
      <ul>
        {goods.map((good) => (
          <li key={good.id}>{good.name}</li>
        ))}
      </ul>
    </section>
  )
}
