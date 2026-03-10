import {
  extension,
  Page,
  Section,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Banner,
  Divider,
  Image,
  Badge,
  SkeletonText,
  View,
  Grid,
  GridItem,
} from "@shopify/ui-extensions-react/customer-account";

import { useState, useEffect } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const isWarrantyActive = (warrantyEndDate) => {
  if (!warrantyEndDate) return false;
  return new Date(warrantyEndDate) > new Date();
};

// Use ctWatchesShopifyHandle to fetch the exact product image
const fetchProductImage = async (handle) => {
  if (!handle) return null;
  try {
    const res = await fetch(`/products/${handle}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.product?.images?.[0]?.src || null;
  } catch {
    return null;
  }
};

// ─── Watch Card ───────────────────────────────────────────────────────────────

function WatchCard({ watch, isNew, warrantyWasExtended }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    fetchProductImage(watch.ctWatchesShopifyHandle).then(setImageUrl);
  }, [watch.ctWatchesShopifyHandle]);

  const warrantyActive = isWarrantyActive(watch.warrantyEndDate);

  return (
    <View border="base" borderRadius="base" padding="base" background="subdued">
      <BlockStack spacing="base">

        {/* New registration badges */}
        {isNew && (
          <InlineStack spacing="tight">
            <Badge tone="success">Newly Registered</Badge>
            {warrantyWasExtended && (
              <Badge tone="info">Warranty Extended</Badge>
            )}
          </InlineStack>
        )}

        {/* Watch image from Shopify product */}
        {imageUrl && (
          <Image
            source={imageUrl}
            accessibilityDescription={`NORQAIN ${watch.reference || "timepiece"}`}
            aspectRatio={1.5}
            fit="contain"
          />
        )}

        {/* Reference + serial */}
        <BlockStack spacing="extraTight">
          <Text size="large" emphasis="bold">
            {watch.reference ? `Ref. ${watch.reference}` : "NORQAIN Timepiece"}
          </Text>
          <Text appearance="subdued" size="small">
            Serial No. {watch.serial_number}
          </Text>
        </BlockStack>

        <Divider />

        {/* Details grid */}
        <Grid columns={["fill", "fill"]} spacing="base">
          <GridItem>
            <BlockStack spacing="extraTight">
              <Text size="small" appearance="subdued">Sale Date</Text>
              <Text size="small" emphasis="bold">{formatDate(watch.sell_date)}</Text>
            </BlockStack>
          </GridItem>

          <GridItem>
            <BlockStack spacing="extraTight">
              <Text size="small" appearance="subdued">Activation Date</Text>
              <Text size="small" emphasis="bold">{formatDate(watch.activationDate)}</Text>
            </BlockStack>
          </GridItem>

          <GridItem>
            <BlockStack spacing="extraTight">
              <Text size="small" appearance="subdued">Warranty Expires</Text>
              <Text
                size="small"
                emphasis="bold"
                appearance={
                  watch.warrantyEndDate
                    ? warrantyActive ? "success" : "critical"
                    : undefined
                }
              >
                {watch.warrantyEndDate
                  ? formatDate(watch.warrantyEndDate)
                  : "Standard (2 yrs from sale)"}
              </Text>
            </BlockStack>
          </GridItem>

          <GridItem>
            <BlockStack spacing="extraTight">
              <Text size="small" appearance="subdued">Extended Warranty</Text>
              <Badge tone={watch.warrantyExtended === "1" ? "success" : "neutral"}>
                {watch.warrantyExtended === "1" ? "Active" : "Not extended"}
              </Badge>
            </BlockStack>
          </GridItem>
        </Grid>

      </BlockStack>
    </View>
  );
}

// ─── Registration Form ────────────────────────────────────────────────────────

function RegistrationForm({ customer, onSuccess }) {
  const [serial, setSerial] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getErrorMessage = (message) => {
    switch (message) {
      case "noSaleRecorded":
        return "No sale record was found for this serial number. Please double-check the number on the case back of your watch, or contact NORQAIN support.";
      case "alreadyActivated":
        return "This watch has already been registered. If you believe this is incorrect, please contact NORQAIN support.";
      case "invalidActivationCode":
        return "The activation code is incorrect. Please check your warranty card and try again.";
      default:
        return "Something went wrong. Please try again or contact NORQAIN support.";
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!serial.trim()) {
      setError("Please enter your serial number.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        name: customer.firstName || "",
        surname: customer.lastName || "",
        userid: customer.id || "",
        email: customer.email || "",
        serial: serial.trim(),
        activationCode: activationCode.trim(),
      });

      const res = await fetch("https://api.norqain.com/shopify/registerWatch.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: params.toString(),
      });

      const data = await res.json();

      if (data.success) {
        // data.watch = the registered watch object
        // data.warrantyExtended = true if warranty was extended
        onSuccess(data.watch, data.warrantyExtended === true);
      } else {
        setError(getErrorMessage(data.message));
      }
    } catch {
      setError("Unable to reach the registration service. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BlockStack spacing="base">
      <Text appearance="subdued">
        Enter the serial number from the case back of your watch and the activation code from your warranty card.
      </Text>

      {error && <Banner tone="critical">{error}</Banner>}

      <TextField
        label="Serial Number"
        value={serial}
        onChange={setSerial}
        disabled={loading}
      />
      <TextField
        label="Activation Code"
        value={activationCode}
        onChange={setActivationCode}
        placeholder="e.g. XXXX-XXXX"
        disabled={loading}
      />
      <Button kind="primary" onPress={handleSubmit} loading={loading} disabled={loading || !serial.trim()}>
        Register Watch
      </Button>
    </BlockStack>
  );
}

// ─── Collection View ──────────────────────────────────────────────────────────

function CollectionView({ watches, newWatchId, warrantyExtendedId, onRegisterAnother }) {
  return (
    <BlockStack spacing="base">
      <Text size="large" emphasis="bold">My Watches</Text>
      {watches.map((watch) => (
        <WatchCard
          key={watch.id}
          watch={watch}
          isNew={String(watch.id) === String(newWatchId)}
          warrantyWasExtended={String(watch.id) === String(warrantyExtendedId)}
        />
      ))}
      <Button kind="secondary" onPress={onRegisterAnother}>
        Register Another Watch
      </Button>
    </BlockStack>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function App({ customer }) {
  // states: loading | empty | collection | registering | success
  const [state, setState] = useState("loading");
  const [watches, setWatches] = useState([]);
  const [newWatchId, setNewWatchId] = useState(null);
  const [warrantyExtendedId, setWarrantyExtendedId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadCollection();
  }, []);

  const loadCollection = async () => {
    setState("loading");
    try {
      const params = new URLSearchParams({
        userid: customer.id || "",
      });
      const res = await fetch("https://api.norqain.com/shopify/getWatches.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: params.toString(),
      });
      if (res.ok) {
        const data = await res.json();
        // Response format: { "watches": [...] }
        const list = data.watches || [];
        setWatches(list);
        setState(list.length > 0 ? "collection" : "empty");
      } else {
        setState("empty");
      }
    } catch {
      setState("empty");
    }
  };

  const handleSuccess = (watch, warrantyWasExtended) => {
    // Add new watch to top of collection list, or update if it already exists
    setWatches((prev) => {
      const exists = prev.find((w) => String(w.id) === String(watch.id));
      if (exists) {
        return prev.map((w) => String(w.id) === String(watch.id) ? { ...w, ...watch } : w);
      }
      return [watch, ...prev];
    });

    setNewWatchId(watch.id);

    if (warrantyWasExtended) {
      setWarrantyExtendedId(watch.id);
      setSuccessMessage(
        "Your watch has been registered and your warranty has been extended. Welcome to the NORQAIN family."
      );
    } else {
      setWarrantyExtendedId(null);
      setSuccessMessage("Your watch has been successfully registered. Welcome to the NORQAIN family.");
    }

    setState("success");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <Page>
        <BlockStack spacing="loose">
          <SkeletonText inlineSize="large" />
          <SkeletonText inlineSize="medium" />
          <SkeletonText inlineSize="small" />
        </BlockStack>
      </Page>
    );
  }

  return (
    <Page>
      <BlockStack spacing="loose">

        {/* Header */}
        <BlockStack spacing="tight">
          <Text size="extraLarge" emphasis="bold">My Collection</Text>
          <Text appearance="subdued">
            Register your NORQAIN timepiece to activate your warranty and build your personal collection.
          </Text>
        </BlockStack>

        <Divider />

        {/* Success banner */}
        {state === "success" && successMessage && (
          <Banner tone="success">{successMessage}</Banner>
        )}

        {/* Watch collection list */}
        {(state === "collection" || state === "success") && watches.length > 0 && (
          <CollectionView
            watches={watches}
            newWatchId={newWatchId}
            warrantyExtendedId={warrantyExtendedId}
            onRegisterAnother={() => {
              setSuccessMessage(null);
              setNewWatchId(null);
              setWarrantyExtendedId(null);
              setState("registering");
            }}
          />
        )}

        {/* Registration form */}
        {(state === "empty" || state === "registering") && (
          <Section heading="Register a Watch">
            <RegistrationForm customer={customer} onSuccess={handleSuccess} />
            {watches.length > 0 && (
              <View paddingBlockStart="base">
                <Button kind="plain" onPress={() => setState("collection")}>
                  Back to My Collection
                </Button>
              </View>
            )}
          </Section>
        )}

      </BlockStack>
    </Page>
  );
}

// ─── Extension Entry Point ────────────────────────────────────────────────────

export default extension("customer-account.page.render", (root, { customer }) => {
  root.appendChild(<App customer={customer} />);
});

