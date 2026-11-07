import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { createOwner } from "../../lib/api-client";

const fieldClassName =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function OwnerForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [address, setAddress] = useState("");
  const [success, setSuccess] = useState("");
  const mutation = useMutation({
    mutationFn: createOwner,
    onSuccess: async (owner) => {
      await queryClient.invalidateQueries({ queryKey: ["owners"] });
      setName("");
      setNationalId("");
      setAddress("");
      setSuccess(`Created owner ${owner.name}.`);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSuccess("");
    mutation.mutate({ name, nationalId, address });
  }

  return (
    <form
      className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card"
      onSubmit={handleSubmit}
    >
      <h2 className="font-heading text-lg font-semibold">Add owner</h2>
      <label className="block text-sm font-medium">
        Fictional name
        <input
          className={fieldClassName}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </label>
      <label className="block text-sm font-medium">
        Fictional national ID
        <input
          className={fieldClassName}
          maxLength={80}
          onChange={(event) => setNationalId(event.target.value)}
          required
          value={nationalId}
        />
      </label>
      <label className="block text-sm font-medium">
        Fictional address
        <input
          className={fieldClassName}
          maxLength={300}
          onChange={(event) => setAddress(event.target.value)}
          required
          value={address}
        />
      </label>
      {mutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutation.error.message}
        </p>
      )}
      {success && (
        <p className="text-sm text-muted-foreground" role="status">
          {success}
        </p>
      )}
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        disabled={mutation.isPending}
        type="submit"
      >
        {mutation.isPending ? "Saving…" : "Create owner"}
      </button>
    </form>
  );
}
