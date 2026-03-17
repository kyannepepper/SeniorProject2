import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type PropertyDetails = {
  property_id: string;
  name: string;
  address: string;
  occupied: boolean;
  rent_amount: number | null;
  image_url: string | null;
};

type LeaseDetails = {
  lease_id: string;
  rent_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  signed: boolean | null;
  lease_details: string | null;
};

export default function TenantPropertyInfoScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [lease, setLease] = useState<LeaseDetails | null>(null);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setProperty(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // First find the tenant row for this user with a property_id (and lease_id if present)
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("property_id, lease_id")
          .eq("user_id", session.user.id)
          .not("property_id", "is", null)
          .maybeSingle();
        if (tenantError) throw tenantError;
        if (!tenant?.property_id) {
          setProperty(null);
          setLease(null);
          setLoading(false);
          return;
        }

        // Then load the property details
        const { data: prop, error: propError } = await supabase
          .from("properties")
          .select("property_id, name, address, occupied, rent_amount, image_url")
          .eq("property_id", tenant.property_id)
          .single();
        if (propError) throw propError;

        setProperty(prop as PropertyDetails);

        // Then load the lease details if this tenant has a lease_id
        if (tenant.lease_id) {
          const { data: leaseRow, error: leaseError } = await supabase
            .from("leases")
            .select("lease_id, rent_amount, start_date, end_date, signed, lease_details")
            .eq("lease_id", tenant.lease_id)
            .maybeSingle();
          if (leaseError) throw leaseError;
          if (leaseRow) {
            setLease(leaseRow as LeaseDetails);
          } else {
            setLease(null);
          }
        } else {
          setLease(null);
        }
      } catch (e) {
        console.error("Error loading tenant property info", e);
        Alert.alert("Error", "Could not load property information.");
        setProperty(null);
        setLease(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session?.user?.id]);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  async function handleSignLease() {
    if (!lease) return;
    setSigning(true);
    try {
      const { error } = await supabase
        .from("leases")
        .update({ signed: true })
        .eq("lease_id", lease.lease_id);
      if (error) throw error;
      setLease((prev) => (prev ? { ...prev, signed: true } : prev));
    } catch (e) {
      Alert.alert("Error", "Could not sign lease.");
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No property linked yet</Text>
        <Text style={styles.emptySubtitle}>
          Once a landlord accepts your application, details about your property will appear here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {property.image_url ? (
        <Image source={{ uri: property.image_url }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>No photo</Text>
        </View>
      )}

      <Text style={styles.title}>{property.name}</Text>
      <Text style={styles.address}>{property.address}</Text>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, property.occupied ? styles.badgeOccupied : styles.badgeVacant]}>
          <Text style={styles.badgeText}>
            {property.occupied ? "Occupied" : "Vacant"}
          </Text>
        </View>
        {property.rent_amount != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              Rent: ${property.rent_amount.toFixed(0)}/month
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Property details</Text>
        <Text style={styles.sectionText}>
          This is the property your landlord has linked to your tenant account.
        </Text>
      </View>

      {lease && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lease</Text>
          <Text style={styles.sectionText}>
            Term: {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
          </Text>
          {lease.rent_amount != null && (
            <Text style={styles.sectionText}>
              Rent: ${Number(lease.rent_amount).toFixed(0)}/month
            </Text>
          )}
          <View style={[styles.leaseBadge, lease.signed && styles.leaseBadgeSigned]}>
            <Text style={styles.leaseBadgeText}>
              {lease.signed ? "Signed" : "Unsigned"}
            </Text>
          </View>
          {lease.lease_details && (
            <View style={styles.leaseDetailsBox}>
              <Text style={styles.leaseDetailsText} selectable>
                {lease.lease_details}
              </Text>
            </View>
          )}
          {!lease.signed && (
            <TouchableOpacity
              style={styles.signButton}
              onPress={handleSignLease}
              disabled={signing}
              activeOpacity={0.85}
            >
              <Text style={styles.signButtonText}>
                {signing ? "Signing..." : "Sign lease"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: 24,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#020617",
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#0f172a",
  },
  imagePlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    color: "#64748b",
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 4,
  },
  address: {
    fontSize: 15,
    color: "#94a3b8",
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#1e293b",
  },
  badgeOccupied: {
    backgroundColor: "#16a34a33",
  },
  badgeVacant: {
    backgroundColor: "#f9731633",
  },
  badgeText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "500",
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: "#cbd5f5",
  },
  leaseBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#1e293b",
  },
  leaseBadgeSigned: {
    backgroundColor: "#166534",
  },
  leaseBadgeText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "500",
  },
  leaseDetailsBox: {
    marginTop: 10,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 12,
  },
  leaseDetailsText: {
    fontSize: 13,
    color: "#cbd5f5",
    lineHeight: 20,
  },
  signButton: {
    marginTop: 12,
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  signButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
  },
});

