const supabase = require('./client');

/**
 * Subscribe to real-time RFQ notifications for a supplier
 * @param {string} supplierId
 * @param {function} callback
 */
const subscribeToRFQs = (supplierId, callback) => {
    const channel = supabase
        .channel(`public:rfqs:supplier_id=eq.${supplierId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'rfqs',
                filter: `supplier_id=eq.${supplierId}`
            },
            (payload) => {
                if (callback) callback(payload.new);
            }
        )
        .subscribe((status) => {
            if (status !== 'SUBSCRIBED') {
                 // console.warn('Supabase subscription status:', status);
            }
        });

    return channel;
};

/**
 * Subscribe to real-time quote updates for a buyer
 * @param {string} buyerId
 * @param {function} callback
 */
const subscribeToQuotes = (buyerId, callback) => {
    // Assuming quotes table exists and has buyer_id or linked via RFQ
    // Implementation assumes direct relation for simplicity based on prompt
    const channel = supabase
        .channel(`public:quotes:buyer_id=eq.${buyerId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT', // or UPDATE
                schema: 'public',
                table: 'quotes',
                filter: `buyer_id=eq.${buyerId}`
            },
            (payload) => {
                if (callback) callback(payload.new);
            }
        )
        .subscribe();

    return channel;
};

/**
 * Notify all subscribers of an RFQ update
 * @param {string} rfqId
 * @param {string} status
 */
const broadcastRFQUpdate = async (rfqId, status) => {
    // Broadcast via channel
    const channel = supabase.channel(`rfq_${rfqId}`);

    await channel.subscribe(async (status) => {
         if (status === 'SUBSCRIBED') {
            await channel.send({
                type: 'broadcast',
                event: 'rfq_update',
                payload: { rfqId, status }
            });
            supabase.removeChannel(channel);
         }
    });

    // Also try to update the record if it exists in Supabase to trigger postgres_changes
    // ignoring errors if the record doesn't exist in Supabase (might be only in main DB)
    try {
        await supabase
            .from('rfqs')
            .update({ status })
            .eq('id', rfqId);
    } catch (e) {
        // Ignore
    }
};

/**
 * Notify supplier of new RFQ
 * @param {string} rfqId
 * @param {string} supplierId
 */
const broadcastNewRFQ = async (rfqId, supplierId) => {
    const channel = supabase.channel(`supplier_${supplierId}`);

    await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await channel.send({
                type: 'broadcast',
                event: 'new_rfq',
                payload: { rfqId, supplierId }
            });
            supabase.removeChannel(channel);
        }
    });
};

module.exports = {
    subscribeToRFQs,
    subscribeToQuotes,
    broadcastRFQUpdate,
    broadcastNewRFQ
};
